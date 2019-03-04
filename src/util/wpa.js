import pbkdf2 from 'pbkdf2'
import Mustache from 'mustache'

export function encryptWiFiCredential(ssid, plainPassphrase) {
  return pbkdf2
    .pbkdf2Sync(plainPassphrase, ssid, 4096, 32, 'sha1')
    .toString('hex')
}

export function generateWPAConfig(ssid, passphrase) {
  const template = `network={
  ssid="{{ssid}}"
  psk={{passphrase}}
}
`
  return Mustache.render(template, {
    ssid: ssid,
    passphrase: encryptWiFiCredential(ssid, passphrase),
  })
}
