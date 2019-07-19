import * as wpa from '../wpa'

test('encryptWiFiCredential', async () => {
  const credential = wpa.encryptWiFiCredential('testSSID', 'testPassphrase')
  expect(credential).toBe(
    '60594b01d15d667ae166ae72c1df4035f327b02e7e2060b3b36eeeda30076629'
  )
})

test('generateWPAConfig', async () => {
  const credential = wpa.generateWPAConfig('testSSID', 'testPassphrase')
  expect(credential).toBe(
    `
network={
  ssid="testSSID"
  psk=60594b01d15d667ae166ae72c1df4035f327b02e7e2060b3b36eeeda30076629
  key_mgnt=WPA-PSK
}
`
  )
})
