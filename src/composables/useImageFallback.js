// 画像読み込みエラーハンドリングのためのコンポーサブル
export const useImageFallback = () => {
  const handleImageError = (event) => {
    const img = event.target
    
    // 画像が読み込めない場合は非表示にする
    img.style.display = 'none'
  }
  
  const handleImageLoad = (event) => {
    const img = event.target
    // 画像が正常にロードされた場合
    img.style.display = 'block'
  }
  
  return {
    handleImageError,
    handleImageLoad
  }
}
