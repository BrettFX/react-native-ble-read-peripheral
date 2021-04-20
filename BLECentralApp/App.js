/**
 * Sample BLE React Native App
 *
 * @format
 * @flow strict-local
 */

 import React, { 
   useState,
   useEffect, 
   Component 
} from 'react';

import {
   SafeAreaView,
   StyleSheet,
   View,
   Text,
   StatusBar,
   NativeModules,
   NativeEventEmitter,
   Button,
   Platform,
   PermissionsAndroid,
   FlatList,
   TouchableHighlight,
   BackHandler 
 } from 'react-native';
 
 import { Colors } from 'react-native/Libraries/NewAppScreen';
 
 // import and setup react-native-ble-manager
 import BleManager from 'react-native-ble-manager';
 const BleManagerModule = NativeModules.BleManager;
 const bleEmitter = new NativeEventEmitter(BleManagerModule);
 
 // import stringToBytes from convert-string package.
 // this func is useful for making string-to-bytes conversion easier
 import { stringToBytes } from 'convert-string';

 import Toast from 'react-native-toast-message';
 
 // import Buffer function.
 // this func is useful for making bytes-to-string conversion easier
 const Buffer = require('buffer/').Buffer;
 
 class App extends Component {
  //  [isScanning, setIsScanning] = useState(false);
  //  [list, setList] = useState([]);
   peripherals = new Map();
  //  [testMode, setTestMode] = useState('read');

   constructor(props) {
      super(props);
      this.state = {
        isScanning: false,
        list: [],
        testMode: 'read',
        permissionsGranted: false,
      };

      console.log("Got here (constructor)");
      // if (Platform.OS === 'android') {
      //   this.checkPermissions((permissionsGranted) => {
      //     // Perform initial scan if permissions are granted
      //     if (permissionsGranted) {
      //       console.log("All features of this app are ready to use.");
      //     } else {
      //       BackHandler.exitApp();
      //     }
      //   });
      // } 

      if (Platform.OS === 'android') {
        // const granted = await PermissionsAndroid.request(
        //   PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        //   {
        //     title: 'Permission Localisation Bluetooth',
        //     message: 'Requirement for Bluetooth',
        //     buttonNeutral: 'Later',
        //     buttonNegative: 'Cancel',
        //     buttonPositive: 'OK',
        //   }
        // );

        var granted = false;
        granted = this.checkPermissions();

        if (granted) {
          console.log("Permissions granted!");
        }

        // initialize BLE modules
        BleManager.start({ showAlert: false }).then(() => {
          // Success code
          console.log("Module initialized");
        });
    
        // add ble listeners on mount
        bleEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral);
        bleEmitter.addListener('BleManagerStopScan', this.handleStopScan);
        bleEmitter.addListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral);
        bleEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', this.handleUpdateValueForCharacteristic);

        // this.checkPermissions((permissionsGranted) => {
        //   // Perform initial scan if permissions are granted
        //   if (permissionsGranted) {
        //     console.log("All features of this app are ready to use.");
        //     // initialize BLE modules
        //     BleManager.start({ showAlert: false }).then(() => {
        //       // Success code
        //       console.log("Module initialized");
        //     });
        
        //     // add ble listeners on mount
        //     bleEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral);
        //     bleEmitter.addListener('BleManagerStopScan', this.handleStopScan);
        //     bleEmitter.addListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral);
        //     bleEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', this.handleUpdateValueForCharacteristic);
        //   } else {
        //     BackHandler.exitApp();
        //   }
        // });
      } else {
        // initialize BLE modules
        BleManager.start({ showAlert: false }).then(() => {
          // Success code
          console.log("Module initialized");
        });
    
        // add ble listeners on mount
        bleEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral);
        bleEmitter.addListener('BleManagerStopScan', this.handleStopScan);
        bleEmitter.addListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral);
        bleEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', this.handleUpdateValueForCharacteristic);
      }
   }

   setIsScanning = (scanning) => {
      this.setState({isScanning: scanning});
   };

   setList = (list) => {
     this.setState({list: list});
   };

   setTestMode = (mode) => {
     this.setState({testMode : mode});
   };
 
   // start to scan peripherals
   startScan = () => {
 
     // skip if scan process is currenly happening
     if (this.state.isScanning) {
       return;
     }
 
     // first, clear existing peripherals
     this.peripherals.clear();
     this.setList(Array.from(this.peripherals.values()));
 
     // then re-scan it
     BleManager.scan([], 3, true)
       .then(() => {
         console.log('Scanning...');
         this.setIsScanning(true);
       })
       .catch((err) => {
         console.error(err);
       });
   };
 
   // handle discovered peripheral
   handleDiscoverPeripheral = (peripheral) => {
     console.log('Got ble peripheral', peripheral);
 
     if (!peripheral.name) {
       peripheral.name = 'NO NAME';
     }
 
     this.peripherals.set(peripheral.id, peripheral);
     this.setList(Array.from(this.peripherals.values()));
   };
 
   // handle stop scan event
   handleStopScan = (info) => {
     console.log('Scan is stopped');
     if (info && Object.keys(info).length > 0) {
      console.log("Got the following info", info);
     }
     
     this.setIsScanning(false);
   };
 
   // handle disconnected peripheral
   handleDisconnectedPeripheral = (data) => {
     console.log('Disconnected from ' + data.peripheral);
 
     let peripheral = this.peripherals.get(data.peripheral);
     if (peripheral) {
       peripheral.connected = false;
       this.peripherals.set(peripheral.id, peripheral);
       this.setList(Array.from(this.peripherals.values()));
     }
   };
 
   // handle update value for characteristic
   handleUpdateValueForCharacteristic = (data) => {
     console.log(
       'Received data from: ' + data.peripheral,
       'Characteristic: ' + data.characteristic,
       'Data: ' + data.value,
     );
   };
 
   // retrieve connected peripherals.
   // not currenly used
   retrieveConnectedPeripheral = () => {
     BleManager.getConnectedPeripherals([]).then((results) => {
       this.peripherals.clear();
       this.setList(Array.from(this.peripherals.values()));
 
       if (results.length === 0) {
         console.log('No connected peripherals');
       }
 
       for (var i = 0; i < results.length; i++) {
         var peripheral = results[i];
         peripheral.connected = true;
         this.peripherals.set(peripheral.id, peripheral);
         this.setList(Array.from(this.peripherals.values()));
       }
     });
   };
 
   // update stored peripherals
   updatePeripheral = (peripheral, callback) => {
     let p = this.peripherals.get(peripheral.id);
     if (!p) {
       return;
     }
 
     p = callback(p);
     this.peripherals.set(peripheral.id, p);
     this.setList(Array.from(this.peripherals.values()));
   };
 
   // get advertised peripheral local name (if exists). default to peripheral name
   getPeripheralName = (item) => {
     if (item.advertising) {
       if (item.advertising.localName) {
         return item.advertising.localName;
       }
     }
 
     return item.name;
   };
 
   // connect to peripheral then test the communication
   connectAndTestPeripheral = (peripheral) => {
     if (!peripheral) {
       return;
     }
 
     if (peripheral.connected) {
       BleManager.disconnect(peripheral.id);
       return;
     }
 
     // connect to selected peripheral
     BleManager.connect(peripheral.id)
       .then(() => {
         console.log('Connected to ' + peripheral.id, peripheral);
 
         // update connected attribute
         updatePeripheral(peripheral, (p) => {
           p.connected = true;
           return p;
         });
 
         // retrieve peripheral services info
         BleManager.retrieveServices(peripheral.id).then((peripheralInfo) => {
           console.log('Retrieved peripheral services', peripheralInfo);
 
           // test read current peripheral RSSI value
           BleManager.readRSSI(peripheral.id).then((rssi) => {
             console.log('Retrieved actual RSSI value', rssi);
 
             // update rssi value
             updatePeripheral(peripheral, (p) => {
               p.rssi = rssi;
               return p;
             });
           });
 
           // test read and write data to peripheral
           const serviceUUID = '10000000-0000-0000-0000-000000000001';
           const charasteristicUUID = '20000000-0000-0000-0000-000000000001';
 
           console.log('peripheral id:', peripheral.id);
           console.log('service:', serviceUUID);
           console.log('characteristic:', charasteristicUUID);
 
           switch (this.state.testMode) {
             case 'write':
               // ===== test write data
               const payload = 'pizza';
               const payloadBytes = stringToBytes(payload);
               console.log('payload:', payload);
 
               BleManager.write(peripheral.id, serviceUUID, charasteristicUUID, payloadBytes)
                 .then((res) => {
                   console.log('write response', res);
                   alert(`your "${payload}" is stored to the food bank. Thank you!`);
                 })
                 .catch((error) => {
                   console.log('write err', error);
                 });
               break;
 
             case 'read':
               // ===== test read data
               BleManager.read(peripheral.id, serviceUUID, charasteristicUUID)
                 .then((res) => {
                   console.log('read response', res);
                   if (res) {
                     const buffer = Buffer.from(res);
                     const data = buffer.toString();
                     console.log('data', data);
                     alert(`you have stored food "${data}"`);
                   }
                 })
                 .catch((error) => {
                   console.log('read err', error);
                   alert(error);
                 });
               break;
 
             case 'notify':
               // ===== test subscribe notification
               BleManager.startNotification(peripheral.id, serviceUUID, charasteristicUUID)
                 .then((res) => {
                   console.log('start notification response', res);
                 });
               break;
 
             default:
               break;
           }
         });
       })
       .catch((error) => {
         console.log('Connection error', error);
       });
   };

   checkPermissions = async(callback) => {
      console.log("Got here in permissions check...");
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Permission Localisation Bluetooth',
          message: 'Requirement for Bluetooth',
          buttonNeutral: 'Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      return granted;
      // PermissionsAndroid.requestMultiple(
      //   [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      //   PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]
      //   ).then((result) => {
      //     console.log("Got permissions result", result);
      //     if (result['android.permission.ACCESS_COARSE_LOCATION']
      //     && result['android.permission.ACCESS_FINE_LOCATION'] === 'granted') {
      //       this.setState({
      //         permissionsGranted: true
      //       });
      //       console.log("Permissions granted!");

      //       // Invoke callback with success status
      //       if (callback) {
      //         callback(true);
      //       }

      //     } else if (result['android.permission.ACCESS_COARSE_LOCATION']
      //     || result['android.permission.ACCESS_FINE_LOCATION'] === 'never_ask_again') {
      //       console.log('Please Go into Settings -> Applications -> BLECentralApp -> Permissions and Allow permissions to continue');
      //       console.warn("Permissions denied...");

      //       // Invoke callback with denied status
      //       if (callback) {
      //         callback(false);
      //       }
      //     }
      //   }).catch((err) => {
      //     console.error(err);
      //   });

      //   console.log("Got here (end of permissions check)");
    };
 
   // mount and onmount event handler
   componentDidMount() {
    console.log("Got here (mount)");
    console.log('Mount');

    // if (Platform.OS === 'android') {
    //     this.checkPermissions((permissionsGranted) => {
    //       // Perform initial scan if permissions are granted
    //       if (permissionsGranted) {
    //         console.log("All features of this app are ready to use.");
    //         // initialize BLE modules
    //         BleManager.start({ showAlert: false }).then(() => {
    //           // Success code
    //           console.log("Module initialized");
    //         });
        
    //         // add ble listeners on mount
    //         bleEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral);
    //         bleEmitter.addListener('BleManagerStopScan', this.handleStopScan);
    //         bleEmitter.addListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral);
    //         bleEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', this.handleUpdateValueForCharacteristic);
    //       } else {
    //         BackHandler.exitApp();
    //       }
    //     });
    //   } else {
    //     // initialize BLE modules
    //     BleManager.start({ showAlert: false }).then(() => {
    //       // Success code
    //       console.log("Module initialized");
    //     });
    
    //     // add ble listeners on mount
    //     bleEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral);
    //     bleEmitter.addListener('BleManagerStopScan', this.handleStopScan);
    //     bleEmitter.addListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral);
    //     bleEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', this.handleUpdateValueForCharacteristic);
    //   }
   }

   componentWillUnmount() {
      console.log('Unmount');

      bleEmitter.removeListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral);
      bleEmitter.removeListener('BleManagerStopScan', this.handleStopScan);
      bleEmitter.removeListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral);
      bleEmitter.removeListener('BleManagerDidUpdateValueForCharacteristic', this.handleUpdateValueForCharacteristic);
   }

  //  useEffect(() => {
  //    console.log('Mount');
 
  //    // initialize BLE modules
  //    BleManager.start({ showAlert: false }).then(() => {
  //     // Success code
  //     console.log("Module initialized");
  //   });
 
  //    // add ble listeners on mount
  //    bleEmitter.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
  //    bleEmitter.addListener('BleManagerStopScan', handleStopScan);
  //    bleEmitter.addListener('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral);
  //    bleEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', handleUpdateValueForCharacteristic);

  //    // Prepare return obj
  //    retObj = () => {
  //     console.log('Unmount');

  //     bleEmitter.removeListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
  //     bleEmitter.removeListener('BleManagerStopScan', handleStopScan);
  //     bleEmitter.removeListener('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral);
  //     bleEmitter.removeListener('BleManagerDidUpdateValueForCharacteristic', handleUpdateValueForCharacteristic);
  //   };
 
  //    // Request permissions to be able to use this app (android)
  //    if (Platform.OS === 'android') {
  //       this.checkPermissions((permissionsGranted) => {
  //         // Perform initial scan if permissions are granted
  //         if (permissionsGranted) {
  //           console.log("All features of this app are ready to use.");
  //           return retObj;
  //         } else {
  //           BackHandler.exitApp();
  //         }
  //       });
  //     } else {
  //       return retObj;
  //     }

  //    // check location permission only for android device
  //   //  if (Platform.OS === 'android' && Platform.Version >= 23) {
  //   //    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((r1) => {
  //   //      if (r1) {
  //   //        console.log('Permission is OK');
  //   //       //  return;
  //   //      }
 
  //   //      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((r2) => {
  //   //        if (r2) {
  //   //          console.log('User accept');
  //   //          return
  //   //        }
 
  //   //        console.log('User refuse');
  //   //      });
  //   //    });
  //   //  }
 
  //    // remove ble listeners on unmount
  //   //  return () => {
  //   //    console.log('Unmount');
 
  //   //    bleEmitter.removeListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
  //   //    bleEmitter.removeListener('BleManagerStopScan', handleStopScan);
  //   //    bleEmitter.removeListener('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral);
  //   //    bleEmitter.removeListener('BleManagerDidUpdateValueForCharacteristic', handleUpdateValueForCharacteristic);
  //   //  };
  //  }, []);
 
   // render list of devices
   renderItem = (item) => {
     const color = item.connected ? 'green' : '#fff';
     return (
       <TouchableHighlight onPress={() => this.connectAndTestPeripheral(item)}>
         <View style={[styles.row, {backgroundColor: color}]}>
           <Text
             style={{
               fontSize: 12,
               textAlign: 'center',
               color: '#333333',
               padding: 10,
             }}>
             {this.getPeripheralName(item)}
           </Text>
           <Text
             style={{
               fontSize: 10,
               textAlign: 'center',
               color: '#333333',
               padding: 2,
             }}>
             RSSI: {item.rssi}
           </Text>
           <Text
             style={{
               fontSize: 8,
               textAlign: 'center',
               color: '#333333',
               padding: 2,
               paddingBottom: 20,
             }}>
             {item.id}
           </Text>
         </View>
       </TouchableHighlight>
     );
   };
 
   render() {
    return (
      <>
        <StatusBar barStyle="dark-content" />
        <SafeAreaView style={styles.safeAreaView}>
          {/* header */}
          <View style={styles.body}>
            <View style={styles.scanButton}>
              
              <Button
                title={'Scan Bluetooth Devices'}
                onPress={() => this.startScan()}
              />
            </View>
  
            {this.state.list.length === 0 && (
              <View style={styles.noPeripherals}>
                <Text style={styles.noPeripheralsText}>No peripherals</Text>
              </View>
            )}
          </View>
  
          {/* ble devices */}
          <FlatList
            data={this.state.list}
            renderItem={({item}) => this.renderItem(item)}
            keyExtractor={(item) => item.id}
          />
 
         <Toast style={{margin: 10}} ref={(ref) => Toast.setRef(ref)} />
  
          {/* bottom footer */}
          <View style={styles.footer}>
            <TouchableHighlight onPress={() => {
               this.setTestMode('write');
               Toast.show({
                 text1: 'Test Mode Changed: WRITE',
                 text2: 'Test mode has been set to write.',
                 visibilityTime: 100,
                 autoHide: true,
                 topOffset: 50
               });
             }}>
              <View style={[styles.row, styles.footerButton]}>
                <Text>Store pizza</Text>
              </View>
            </TouchableHighlight>
            <TouchableHighlight onPress={() => {
               this.setTestMode('read');
               Toast.show({
                 text1: 'Test Mode Changed: READ',
                 text2: 'Test mode has been set to read.',
                 visibilityTime: 100,
                 autoHide: true,
                 topOffset: 50
               });
             }}>
              <View style={[styles.row, styles.footerButton]}>
                <Text>Get stored food</Text>
              </View>
            </TouchableHighlight>
          </View>
        </SafeAreaView>
      </>
    );
   }
   
 }
 
 const styles = StyleSheet.create({
   safeAreaView: {
     flex: 1,
   },
   body: {
     backgroundColor: Colors.white,
   },
   scanButton: {
     margin: 10,
   },
   noPeripherals: {
     flex: 1,
     margin: 20,
   },
   noPeripheralsText: {
     textAlign: 'center',
   },
   footer: {
     flexDirection: 'row',
     justifyContent: 'space-around',
     width: '100%',
     marginBottom: 30,
   },
   footerButton: {
     alignSelf: 'stretch',
     padding: 10,
     backgroundColor: 'grey',
   },
 });
 
 export default App;
 