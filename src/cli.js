import { tmpdir } from 'os'
import { join, basename } from 'path'
import inquirer from 'inquirer'
import bytes from 'bytes'
import axios from 'axios'
import * as drivelist from 'drivelist'

import { generateWPAConfig } from './util/wpa'
import { fileStreamWithProgress, extract } from './util/file'

export default async function cli() {
  console.log('Automatic Raspbian Image Writer & Setup Wizard')
  const drives = await drivelist.list()
  const response = await inquirer.prompt([
    {
      type: 'list',
      name: 'target',
      message: 'Choose target device',
      choices: drives.map((d) => ({
        name: `${d.device} - ${d.description} (${bytes(d.size, {
          unitSeparator: ' ',
        })})`,
        value: d,
      })),
    },
    {
      type: 'list',
      name: 'source',
      message: 'Choose version for Raspbian image',
      choices: [
        {
          name: 'Raspbian Stretch Lite (November 2018)',
          value: {
            name: 'Raspbian Stretch Lite',
            url:
              'http://director.downloads.raspberrypi.org/raspbian_lite/images/raspbian_lite-2018-11-15/2018-11-13-raspbian-stretch-lite.zip',
          },
        },
        {
          name: 'Raspbian Stretch with desktop (Latest)',
          value: {
            name: 'Raspbian Stretch with desktop',
            slug: 'raspbian-stretch-with-desktop',
            url: 'https://downloads.raspberrypi.org/raspbian_latest',
          },
        },
      ],
    },
    {
      type: 'confirm',
      name: 'ssh',
      message: 'Enable SSH:',
    },
    {
      type: 'confirm',
      name: 'wifi',
      message: 'Enable Wi-Fi:',
    },
    {
      type: 'input',
      name: 'wifi-ssid',
      message: 'Wi-Fi SSID:',
      when: (a) => a.wifi,
    },
    {
      type: 'password',
      name: 'wifi-passphrase',
      message: 'Wi-Fi Passphrase:',
      when: (a) => a.wifi,
    },
  ])
  console.log(response)

  if (!response.target.isRemovable) {
    const { sure } = await inquirer.prompt({
      type: 'confirm',
      name: 'sure',
      message:
        'Target disk seems not to be removable disk. Are you sure to continue?',
    })
    if (!sure) {
      return
    }
  }

  const { source, ssh, wifi } = response
  const basePath = tmpdir()

  // Download Raspbian image
  const archiveFilename = basename(source.url)
  const archivePath = join(basePath, archiveFilename)

  console.log('Downloading', source.name, archivePath)
  const raspbianData = await axios.get(source.url, {
    responseType: 'stream',
  })
  await fileStreamWithProgress(archivePath, raspbianData)

  // Extract Raspbian image
  const imageFilename = `${basename(source.url, '.zip')}.img`
  const imagePath = join(basePath, imageFilename)

  console.log('Extracting', imageFilename)
  await extract(archivePath, basePath)
  console.log(imagePath)

  // Confirm
  const { sure } = await inquirer.prompt({
    type: 'confirm',
    name: 'sure',
    message: 'Are you sure you want to write SD card?',
  })
  if (!sure) {
    return
  }

  // Write Raspbian image to SD card
  // TODO: dd
  // NOTE:

  // Preconfigure
  if (ssh) {
    console.log('SSH: $ touch /boot/ssh')
  }
  if (wifi) {
    console.log('Wi-Fi: cat <conf> > /boot/wpa_supplicant.conf')
    console.log(
      generateWPAConfig(response['wifi-ssid'], response['wifi-passphrase'])
    )
  }
}
