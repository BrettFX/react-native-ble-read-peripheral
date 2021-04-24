/**
 * Sample BLE React Native App
 *
 * @format
 * @flow strict-local
 */

 import React, { 
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

 import { BluetoothStatus } from 'react-native-bluetooth-status';
 
 // import Buffer function.
 // this func is useful for making bytes-to-string conversion easier
 const Buffer = require('buffer/').Buffer;

//  const [btStatus, isPending, setBluetooth] = useBluetoothStatus();
 
 class App extends Component {
   peripherals = new Map();

   constructor(props) {
     console.log("Contructor init...");
      super(props);
      this.state = {
        isScanning: false,
        list: [],
        testMode: 'read',
        permissionsGranted: false,
        connectedPeripheralId: null,
        bluetoothEnabled: false
      };

      // App requires bluetooth (needs to be in constructor to get accurate reading)
      this.checkBluetoothConnectivity((enabled) => {
        this.setState({bluetoothEnabled: enabled});
        if (!enabled) {
          alert("Bluetooth is turned off. Please turn it on to use this app.");
        } else {
          this.startScan();
        }

        // add bluetooth state change listener
        BluetoothStatus.addListener(this.handleBluetoothStateChange);
        
      });
   }

   setIsScanning = (scanning) => {
      this.setState({isScanning: scanning});
   };

   setList = (list) => {
     this.setState({list: list});
   };

   clearList = () => {
    this.peripherals.clear();
    this.setList(Array.from(this.peripherals.values()));
   }
 
   // start to scan peripherals
   startScan = () => {
 
     // skip if scan process is currenly happening
     if (this.state.isScanning) {
       return;
     }
 
     // first, clear existing peripherals
     this.clearList();
 
     // then re-scan it
     BleManager.scan([], 5, true)
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

   testPeripheral = (peripheralId) => {
      // Do nothing if no peripheral id
      if (!peripheralId) {
        return;
      }

      // test read and write data to peripheral
      const serviceUUID = '10000000-0000-0000-0000-000000000001';
      const charasteristicUUID = '20000000-0000-0000-0000-000000000001';

      console.log('peripheral id:', peripheralId);
      console.log('service:', serviceUUID);
      console.log('characteristic:', charasteristicUUID);

      switch (this.state.testMode) {
        case 'write':
          // ===== test write data
          const payload = 'pizza';
          const payloadBytes = stringToBytes(payload);
          console.log('payload:', payload);

          BleManager.write(peripheralId, serviceUUID, charasteristicUUID, payloadBytes)
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
          BleManager.read(peripheralId, serviceUUID, charasteristicUUID)
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
          BleManager.startNotification(peripheralId, serviceUUID, charasteristicUUID)
            .then((res) => {
              console.log('start notification response', res);
            });
          break;

        default:
          break;
      }
   }
 
   // connect to peripheral then test the communication
   connectAndTestPeripheral = (peripheral) => {
     if (!peripheral) {
       return;
     }
 
     if (peripheral.connected) {
       BleManager.disconnect(peripheral.id);
       this.setState({connectedPeripheralId: null});
       return;
     }
 
     // connect to selected peripheral
     BleManager.connect(peripheral.id)
       .then(() => {
         console.log('Connected to ' + peripheral.id, peripheral);
         this.setState({connectedPeripheralId: peripheral.id});
 
         // update connected attribute
         this.updatePeripheral(peripheral, (p) => {
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
             this.updatePeripheral(peripheral, (p) => {
               p.rssi = rssi;
               return p;
             });
           });

           this.testPeripheral(peripheral.id);
         });
       })
       .catch((error) => {
         console.log('Connection error', error);
       });
   };

   checkPermissions = async(callback) => {
     // No need to check permissions this way if ios
     if (Platform.OS === 'ios') {
       if (callback) callback(true);
       return;
     }

      PermissionsAndroid.requestMultiple(
        [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]
        ).then((result) => {
          console.log("Got permissions result", result);
          if (result['android.permission.ACCESS_COARSE_LOCATION']
          && result['android.permission.ACCESS_FINE_LOCATION'] === 'granted') {
            this.setState({
              permissionsGranted: true
            });

            // Invoke callback with success status
            if (callback) {
              callback(true);
            }

          } else if (result['android.permission.ACCESS_COARSE_LOCATION']
          || result['android.permission.ACCESS_FINE_LOCATION'] === 'never_ask_again') {
            console.log('Please Go into Settings -> Applications -> BLECentralApp -> Permissions and Allow permissions to continue');
            console.warn("Permissions denied...");

            // Invoke callback with denied status
            if (callback) {
              callback(false);
            }
          }
        }).catch((err) => {
          console.error(err);
        });
    };

    checkBluetoothConnectivity = async(callback) => {
      const isEnabled = await BluetoothStatus.state();
      callback(isEnabled);
    }

    handleBluetoothStateChange = (enabled) => {
      this.setState({bluetoothEnabled: enabled});
      if (!enabled) {
        alert("Bluetooth disabled. You must have bluetooth enabled to use this application. Please turn on bluetooth now.");

        // Clear the peripheral list
        this.clearList();
      } else {
        // Do scan to get fresh list of peripherals
        this.startScan();
      }
    }
 
   // mount and onmount event handler
   componentDidMount() {
     console.log("Mounted");
      // Check permissions and initialize ble manager
      this.checkPermissions((granted) => {
        if (granted) {
          console.log("Permissions granted!");

          // initialize BLE modules (okay to init bluetooth if bluetooth isn't enabled yet)
          BleManager.start({ showAlert: false }).then(() => {
            // Success code
            console.log("Module initialized");
          });

          // add ble listeners on mount
          bleEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral);
          bleEmitter.addListener('BleManagerStopScan', this.handleStopScan);
          bleEmitter.addListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral);
          bleEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', this.handleUpdateValueForCharacteristic);
          
        } else {
          alert("Permissions are denied. This app will not function as intended until permissions are enabled.");
        }
      });
   }

   componentWillUnmount() {
      console.log('Unmount');

      bleEmitter.removeListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral);
      bleEmitter.removeListener('BleManagerStopScan', this.handleStopScan);
      bleEmitter.removeListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral);
      bleEmitter.removeListener('BleManagerDidUpdateValueForCharacteristic', this.handleUpdateValueForCharacteristic);
   }
 
   // render list of devices
   renderItem = (item) => {
     const bgColor = item.connected ? 'green' : '#fff';
     const fgColor = item.connected ? 'white' : '#333333';

     return (
       <TouchableHighlight onPress={() => this.connectAndTestPeripheral(item)}>
         <View style={[styles.row, {backgroundColor: bgColor}]}>
           <Text
             style={{
               fontSize: 12,
               textAlign: 'center',
               color: fgColor,
               padding: 10,
             }}>
             {this.getPeripheralName(item)}
           </Text>
           <Text
             style={{
               fontSize: 10,
               textAlign: 'center',
               color: fgColor,
               padding: 2,
             }}>
             RSSI: {item.rssi}
           </Text>
           <Text
             style={{
               fontSize: 8,
               textAlign: 'center',
               color: fgColor,
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
                title={this.state.isScanning ? 'Scanning Bluetooth Devices...' : 'Scan Bluetooth Devices'}
                onPress={() => this.startScan()}
                disabled={!(this.state.bluetoothEnabled && !this.state.isScanning)}
              />

              {/* {Platform.OS === 'android' && (isPending || !btStatus) && (
                <Button title="Toggle BT" onPress={() => setBluetooth(!btStatus)} />
              )} */}
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
               // Invoke functions after state has been changed (using callback)
               this.setState({testMode : 'write'}, () => {
                Toast.show({
                  text1: 'Test Mode Changed: WRITE',
                  text2: 'Test mode has been set to write.',
                  visibilityTime: 100,
                  autoHide: true,
                  topOffset: 50
                });
 
                // Test write (does nothing if not currently connected to peripheral)
                this.testPeripheral(this.state.connectedPeripheralId);
               });
             }}>
              <View style={[styles.row, styles.footerButton]}>
                <Text>Store pizza</Text>
              </View>
            </TouchableHighlight>
            <TouchableHighlight onPress={() => {
               // Invoke functions after state has been changed (using callback)
               this.setState({testMode : 'read'}, () => {
                Toast.show({
                  text1: 'Test Mode Changed: READ',
                  text2: 'Test mode has been set to read.',
                  visibilityTime: 100,
                  autoHide: true,
                  topOffset: 50
                });
 
                // Test read (does nothing if not currently connected to peripheral)
                this.testPeripheral(this.state.connectedPeripheralId);
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
 