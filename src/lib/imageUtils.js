const getPublicImageUrl = (imagePath) => {
  if (!imagePath) return null
  
  // URLをそのまま返す（Supabaseの新しい画像URLを使用）
  return imagePath
}

export default getPublicImageUrl
