/**
 * OSC relaying server —  Bi-Directional OSC messaging Websocket <-> UDP
 *
 * Bridges OSC messages sent/received over UDP from a remote OSC controller
 * (TouchOSC or Lemur apps running on an iPad, for instance) to a remote
 * OSC client web app over a Web Socket.
 */
const OSC = require( "osc-js");

const oscBridgeConfig = {
  // @param {string} Where messages sent via `send()` method will be
  //   delivered to: "ws" for Websocket clients, "udp" for UDP client
  receiver: "ws",

  udpServer: {
    // @param {string} Hostname of UDP server to bind to
    host: process.env.npm_package_config_osc_relay_udp_server_host || "localhost",
    // @param {number} Port of UDP server to bind to
    port: process.env.npm_package_config_osc_relay_udp_server_port || 8000,
    // @param {boolean} Exclusive flag
    exclusive: false
  },
  udpClient: {
    // @param {string} Hostname of UDP client for messaging
    host: process.env.npm_package_config_osc_relay_udp_client_host || "localhost",
    // @param {number} Port of UDP client for messaging
    port: process.env.npm_package_config_osc_relay_udp_client_port || 9000
  },
  wsServer: {
    // @param {string} Hostname of WebSocket server
    host: process.env.npm_package_config_osc_relay_ws_server_host || "localhost",
    // @param {number} Port of WebSocket server
    port: process.env.npm_package_config_osc_relay_ws_server_port || 8080
  }
}

function showConfig( config) {
  console.info(
    `Bridging OSC over Web Socket to/from \`ws://${config.wsServer.host}:${config.wsServer.port}\``);
  console.log(
    `Listening for OSC over UDP on \`${config.udpServer.host}:${config.udpServer.port}\``);
  console.info(
    `Broadcasting OSC over UDP to \`${config.udpClient.host}:${config.udpClient.port}\``);
}

function start() {
  const plugin = new OSC.BridgePlugin( oscBridgeConfig);
  const osc = new OSC({ plugin });

  osc.open();
  osc.on( "open", () => showConfig( oscBridgeConfig));
  osc.on( "close", () => console.info( "Connection was closed."));
  osc.on( "error", (err) => console.error( "An error occurred:", err));
  // osc.options.plugin.socket.on( "message", (msg) => console.log( "OSC msg on socket:", msg));

  return osc;
}

function autoSendPing( osc, interval) {
  function sendPing( osc) {
    const message = new OSC.Message( "/ping", ++count, Date.now())
    console.log( "Sending OSC message: /ping", message.args);
    osc.send( message);
  }

  let count = 0;
  console.log( `Will ping WS every ${interval}ms with count and time of invocation`);
  setInterval( sendPing, interval, osc);
}

console.log( "OSC Websocket <-> UDP relay server");
const osc = start();

console.log( "Process argv:", process.argv);
if( process.argv.indexOf( "--auto-ping") > -1) {
  autoSendPing( osc, 5000); // interval in milliseconds
}

process.on( "SIGINT", function() {
  console.info( "Received CTRL-C, stopping OSC relay.")
  osc.close();
  process.exit();
});