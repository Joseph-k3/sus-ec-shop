/**
 * デバッグユーティリティ
 * 動画ファイルの詳細情報を取得・分析するためのツール
 */

export class VideoDebugger {
  constructor() {
    this.logs = []
  }

  log(message, data = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      data
    }
    this.logs.push(logEntry)
    console.log(`[VideoDebug] ${message}`, data || '')
  }

  async analyzeVideoFile(file) {
    this.log('動画ファイル分析開始', {
      name: file.name,
      size: file.size,
      type: file.type
    })

    const analysis = {
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      },
      validation: {
        isVideo: file.type.startsWith('video/'),
        isMp4: file.type === 'video/mp4',
        sizeOk: file.size > 0 && file.size < 100 * 1024 * 1024, // 100MB limit
      },
      binary: null,
      structure: null
    }

    // バイナリ分析
    try {
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      
      analysis.binary = {
        header: Array.from(uint8Array.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '),
        hasFtypBox: this.findMp4Box(uint8Array, 'ftyp') !== -1,
        hasMoovBox: this.findMp4Box(uint8Array, 'moov') !== -1,
        hasMdatBox: this.findMp4Box(uint8Array, 'mdat') !== -1,
        moovPosition: this.findMp4Box(uint8Array, 'moov'),
        mdatPosition: this.findMp4Box(uint8Array, 'mdat')
      }

      analysis.structure = {
        isValidMp4: analysis.binary.hasFtypBox && analysis.binary.hasMoovBox,
        isFastStart: analysis.binary.moovPosition < analysis.binary.mdatPosition && analysis.binary.moovPosition !== -1,
        estimatedDuration: 'unknown'
      }

      this.log('バイナリ分析完了', analysis.binary)
      this.log('構造分析完了', analysis.structure)

    } catch (error) {
      this.log('バイナリ分析エラー', error.message)
      analysis.binary = { error: error.message }
    }

    return analysis
  }

  findMp4Box(uint8Array, boxType) {
    const boxBytes = new TextEncoder().encode(boxType)
    
    for (let i = 0; i < uint8Array.length - boxBytes.length; i++) {
      let match = true
      for (let j = 0; j < boxBytes.length; j++) {
        if (uint8Array[i + 4 + j] !== boxBytes[j]) {
          match = false
          break
        }
      }
      if (match) {
        return i
      }
    }
    return -1
  }

  async testVideoPlayback(videoUrl) {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      
      const result = {
        url: videoUrl,
        canLoad: false,
        canPlay: false,
        duration: null,
        error: null
      }

      video.onloadedmetadata = () => {
        result.canLoad = true
        result.duration = video.duration
        result.canPlay = video.readyState >= 2
        this.log('動画メタデータ読み込み成功', result)
        resolve(result)
      }

      video.onerror = (e) => {
        result.error = video.error ? {
          code: video.error.code,
          message: video.error.message
        } : 'Unknown error'
        this.log('動画読み込みエラー', result.error)
        resolve(result)
      }

      video.oncanplay = () => {
        result.canPlay = true
        this.log('動画再生準備完了')
      }

      setTimeout(() => {
        if (!result.canLoad && !result.error) {
          result.error = 'Timeout loading video'
          this.log('動画読み込みタイムアウト')
          resolve(result)
        }
      }, 10000)

      video.src = videoUrl
    })
  }

  generateReport() {
    return {
      timestamp: new Date().toISOString(),
      logs: this.logs,
      summary: {
        totalLogs: this.logs.length,
        errors: this.logs.filter(l => l.message.includes('エラー')).length,
        warnings: this.logs.filter(l => l.message.includes('警告')).length
      }
    }
  }

  exportLogs() {
    const report = this.generateReport()
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `video-debug-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  clear() {
    this.logs = []
  }
}

export const debugLogger = new VideoDebugger()
