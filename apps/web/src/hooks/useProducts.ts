import { useEffect, useState } from 'react'
import { getProducts } from '../lib/api'
import type { Product } from '@warungkit/contracts'

type ProductState = {
  products: Product[]
  loading: boolean
  error: string | null
}

export function useProducts() {
  const [state, setState] = useState<ProductState>({ products: [], loading: true, error: null })

  useEffect(() => {
    const controller = new AbortController()

    getProducts(controller.signal)
      .then((products) => setState({ products, loading: false, error: null }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setState({
          products: [],
          loading: false,
          error: error instanceof Error ? error.message : 'Terjadi kendala saat memuat katalog.',
        })
      })

    return () => controller.abort()
  }, [])

  return state
}
