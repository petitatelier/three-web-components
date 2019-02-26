function getIPAddresses() {
  const os = require( "os"),
        interfaces = os.networkInterfaces(),
        ipAddresses = [];

  for( let deviceName in interfaces) {
    const addresses = interfaces[ deviceName];
    for( let i = 0; i < addresses.length; i++) {
      const addressInfo = addresses[ i];
      if( addressInfo.family === "IPv4" && !addressInfo.internal) {
        ipAddresses.push( `${deviceName}: \`${addressInfo.address}\``);
      }
    }
  }
  return ipAddresses;
}

function showIpAddresses() {
  const ipAddresses = getIPAddresses();
  console.log( `IP addresses of network interfaces : [ ${ipAddresses.join( ", ")} ]`);
}

showIpAddresses();