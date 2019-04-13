import React from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import { Accelerometer, AuthSession } from 'expo';
import { encode as btoa } from 'base-64'

export default class App extends React.Component {
    credentials = require('./secrets.js');

    scopes = '';
    hit = true;
    //how many bmp readings we average together
    bmpResistance = 3
    bmpArr = []
    //tolernce of accelerometer data to prevent false hits
    tolerance = 3.14159265358979
    //the range +- that an acceptible song is in
    bmpTolerance = 5
    url = 'https://api.spotify.com/v1/recommendations'
    auth_url = 'https://accounts.spotify.com/authorize'

    // The url of the our app that spotify will redirect to after authenticating
    auth = AuthSession.getRedirectUrl()

    state = {
        accelerometerData: {},
        bpm: 0,
        hits: 0,
        accessTokenAvailable: false,
        userPreferences: 'acoustic,afrobeat,alt-rock,alternative,ambient'
    };
    // Temperary dummy object for storing session data
    userData = {
        accessToken: '',
        refreshToken: '',
        expirationTime: ''
    }

    setUserPreferences(genres) {
        this.setState({ userPreferences: genres })
    }

    /*
     * Users must login through spotify for us to access their data
     * and use it to make recommendations. This function just lets us redirect
     * them to spotify in our app
     */
    getAuthorizationCode = async () => {

        try {
            // Redirect to spotify for login and get user access token
            result = await AuthSession.startAsync({
                authUrl:
                    this.auth_url +
                    '?response_type=code' +
                    '&client_id=' + this.credentials.secrets.clientID +
                    (this.scopes ? '&scope=' + encodeURIComponent(this.scopes) : '') +
                    '&redirect_uri=' +
                    encodeURIComponent(this.auth)
            });
        } catch (err) {
            console.error(err)
        }
        console.log(result.params.code)
        return result.params.code
    }

    /*
     * So to get an access token for a profile, spotify requires
     * developers to give the clientID and clientSecret for their app
     * to the auth endpoint which will make sure everything is leget
     * then spit out an access token for that user. The access token is what
     * lets us play with user data (like make recommendations based on their past listens)
     */
    getTokens = async () => {
        try {
            // Redirect to spotify
            const authorizationCode = await this.getAuthorizationCode()

            // Things need to be base64 encoded
            const credsB64 = btoa(`${this.credentials.secrets.clientID}:${this.credentials.secrets.clientSecret}`)

            // POST request for the tokens
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${credsB64}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `grant_type=authorization_code&code=${authorizationCode}&redirect_uri=${
                    this.auth
                    }`,
            })

            const responseJson = await response.json()

            const {
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_in: expiresIn,
            } = responseJson

            const expirationTime = new Date().getTime() + expiresIn * 1000

            // Save the user data somehow
            // It probably shouldn't be just an object like this
            // but to make sure it works then this is fine
            this.userData.accessToken = accessToken
            this.userData.refreshToken = refreshToken
            this.userData.expirationTime = expirationTime

        } catch (err) {
            console.error(err)
        }
    }

    async componentDidMount() {
        con = this
        this._subscribe();
        this._interval = setInterval(() => {
            if (con.bmpArr.length == con.bmpResistance) {
                con.bmpArr.shift()
                con.bmpArr.push(con.state.hits * 12)
            }
            else {
                con.bmpArr.push(con.state.hits * 12)
            }
            let ammt = Math.min(con.bmpArr.length, con.bmpResistance)
            let avg = 0
            for (i = 0; i < ammt; i++) {
                avg += con.bmpArr[i]
            }
            avg = avg / ammt
            con.setState({ bmp: avg })
            con.setState({ hits: 0 })
        }, 5000);
        const tokenExpirationTime = this.userData.expirationTime
        if (!tokenExpirationTime || new Date().getTime() > tokenExpirationTime) {
            await this.getTokens()
        } else {
            // Set the state so react we know we have the access token
            this.setState({ accessTokenAvailable: true })
        }
    }

    componentWillUnmount() {
        clearInterval(this._interval);
        this._unsubscribe();
    }
    _subscribe = () => {
        con = this
        this._subscription = Accelerometer.addListener(
            accelerometerData => {
                this.setState({ accelerometerData });
                con.calculateHit()
            }
        );
    };
    _unsubscribe = () => {
        this._subscription && this._subscription.remove();
        this._subscription = null;
    };

    calculateHit() {
        let {
            x,
            y,
            z,
        } = this.state.accelerometerData;

        if (Math.sqrt((x * x) + (y * y) + (z * z)) > this.tolerance && hit) {
            this.setState({ hits: this.state.hits + 1 });
            this.hit = false;
        }
        if (Math.sqrt((x * x) + (y * y) + (z * z)) < this.tolerance && !hit) {
            this.hit = true;
        }
    }

    async getSpotifyRecomendations() {
        return await fetch(this.url +
            '?seed_genres=' + this.state.userPreferences +
            '&min_tempo=' + (Math.max((this.state.bpm - this.bmpTolerance), 0)) +
            '&max_tempo=' + (this.state.bpm + this.bmpTolerance) +
            '&target_danceability=0.8' +
            '&market=US',
            {
                method: "GET",
                headers: {
                    'Authorization': 'Bearer ' + this.userData.accessToken
                }
            }).then(async (res) => {
                return await res.json()
            })
    }

    render() {
        let bpm = this.state.bpm
        let hits = this.state.hits
        return (
            <View style={this.styles.container}>
                <Text>Open up App.js to start working on your app!</Text>
                <Text>Accelerometer:</Text>
                <Text>
                    hits: {hits}
                    bpm: {bpm}
                </Text>
                <Button title="PRESS" onPress={() => {
                    this.getSpotifyRecomendations().then((jsonc) => console.log(jsonc))
                }} />
            </View>
        );
    }

    styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
        },
    });
}