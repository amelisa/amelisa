import React from 'react'

function createElement (...args) {
  return React.createElement.apply(null, args)
}

export default createElement
