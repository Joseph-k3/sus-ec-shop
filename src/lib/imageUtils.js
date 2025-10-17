const getPublicImageUrl = (imagePath) => {
  if (!imagePath) return null
  
  // ダブルスラッシュを修正（例：https://xxx.r2.dev//products → https://xxx.r2.dev/products）
  // プロトコル部分（https://）は保持し、それ以外のダブルスラッシュを単一にする
  const fixedUrl = imagePath.replace(/([^:]\/)\/+/g, '$1')
  
  return fixedUrl
}

export default getPublicImageUrl
