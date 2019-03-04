import fs from 'fs'
import CLIProgress from 'cli-progress'
import extractZIP from 'extract-zip'

export function fileStreamWithProgress(fileName, response) {
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(fileName)
    const contentSize = response.headers['content-length']
    const bar = new CLIProgress.Bar({
      etaBuffer: 500,
    })
    let currentSize = 0

    bar.start(contentSize, 0)

    writeStream.on('finish', () => {
      bar.stop()
      resolve(fileName)
    })
    response.data.on('data', (e) => {
      currentSize += e.length
      bar.update(currentSize)
    })
    response.data.on('error', reject)

    response.data.pipe(writeStream)
  })
}

export async function extract(source, target) {
  return new Promise((resolve, reject) => {
    extractZIP(source, { dir: target }, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
