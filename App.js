import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Accelerometer } from 'expo';

export default class App extends React.Component {
  state = {
    accelerometerData: {},
  };
  componentDidMount() {
    this._subscribe();
  }

  componentWillUnmount() {
    this._unsubscribe();
  }
  _subscribe = () => {
    this._subscription = Accelerometer.addListener(
      accelerometerData => {
        this.setState({ accelerometerData });
      }
    ); 
  };
  _unsubscribe = () => {
    this._subscription && this._subscription.remove(); 
    this._subscription = null;
  };
  render() {
    let {
      x,
      y,
      z,
    } = this.state.accelerometerData; 
    return (
      <View style={styles.container}>
        <Text>Open up App.js to start working on your app!</Text>
        <Text>Accelerometer:</Text>
        <Text>
          x: {x} y: {y} z: {z}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
