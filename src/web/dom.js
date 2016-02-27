function onDomReady () {
  return new Promise((resolve, reject) => {
    if (document.readyState === 'complete') {
      resolve()
    } else {
      window.addEventListener('load', resolve, false)
    }
  })
}

function getBundleJsonFromDom () {
  let dataScript = document.getElementById('bundle')
  if (!dataScript) return '{}'

  return dataScript.innerHTML
}

export default {
  onDomReady,
  getBundleJsonFromDom
}
