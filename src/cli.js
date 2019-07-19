import { tmpdir } from 'os'
import { join, basename } from 'path'
import inquirer from 'inquirer'
import bytes from 'bytes'
import axios from 'axios'
import fs from 'fs'
import cachedir from 'cachedir'
import * as drivelist from 'drivelist'
import imageWrite from 'etcher-image-write'

import { generateWPAConfig } from './util/wpa'
import { fileStreamWithProgress, extract } from './util/file'

const raspbianCatalog = [
  {
    name: 'Raspbian Buster with desktop (2019-07-12)',
    url:
      'https://downloads.raspberrypi.org/raspbian/images/raspbian-2019-07-12/2019-07-10-raspbian-buster.zip',
    file: '2019-07-10-raspbian-buster.img',
  },
  {
    name: 'Raspbian Buster Lite (2019-07-12)',
    url:
      'https://downloads.raspberrypi.org/raspbian_lite/images/raspbian_lite-2019-07-12/2019-07-10-raspbian-buster-lite.zip',
    file: '2019-07-10-raspbian-buster-lite.img',
  },
]
const CACHE_DIR = cachedir('create-raspbian-image')

function writeImage(sourceImagePath, destDrive) {
  return new Promise((resolve, reject) => {
    const emitter = imageWrite.write(
      {
        fd: fs.openSync(destDrive.raw, 'rs+'),
        device: destDrive.raw,
        size: destDrive.size,
      },
      {
        stream: fs.createReadStream(sourceImagePath),
        size: fs.statSync(sourceImagePath).size,
      },
      {
        check: true,
      }
    )

    emitter.on('progress', (state) => {
      console.log(state)
    })

    emitter.on('error', (error) => {
      reject(error)
    })

    emitter.on('done', (result) => {
      resolve(result)
    })
  })
}

export default async function cli() {
  console.log('Automatic Raspbian Image Writer & Setup Wizard')

  const drives = await drivelist.list()
  console.log(drives)
  if (drives.length === 0) {
    console.log('No removable drives found')
    return
  }

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'image',
      message: 'Choose desired Raspbian image',
      choices: raspbianCatalog.map((image) => ({
        name: image.name,
        value: image,
      })),
    },
    {
      type: 'list',
      name: 'device',
      message: 'Choose target device',
      choices: drives.map((drive) => ({
        name: `${drive.device} - ${drive.description} (${bytes(drive.size, {
          unitSeparator: ' ',
        })})`,
        value: drive,
      })),
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
      when: (conf) => conf.wifi,
    },
    {
      type: 'password',
      name: 'wifi-passphrase',
      message: 'Wi-Fi Passphrase:',
      when: (conf) => conf.wifi,
    },
  ])

  const tmpDir = tmpdir()

  // Download Raspbmian image
  const archiveFilename = basename(answer.image.url)
  const archivePath = join(CACHE_DIR, archiveFilename)

  if (!fs.existsSync(archivePath)) {
    console.log(`Downloading ${answer.image.name} to ${archiveFilename}`)
    const raspbianData = await axios.get(answer.image.url, {
      responseType: 'stream',
    })
    await fileStreamWithProgress(archivePath, raspbianData)
  }

  // Extract Raspbian image
  console.log(`Extracting ${archivePath}`)
  await extract(archivePath, tmpDir)

  const imagePath = join(tmpDir, answer.image.file)
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
  console.log('Write', imagePath, answer.device.raw)
  await writeImage(imagePath, answer.device)

  // Configure SSH
  if (answer.ssh) {
    console.log('SSH: $ touch /boot/ssh')
  }

  // Configure Wi-Fi
  if (answer.wifi) {
    console.log('Wi-Fi: cat <conf> > /boot/wpa_supplicant.conf')
    const cryptPSK = generateWPAConfig(
      answer['wifi-ssid'],
      answer['wifi-passphrase']
    )
    console.log(cryptPSK)
  }
}
