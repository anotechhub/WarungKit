import { Route, Routes } from 'react-router-dom'
import { CheckoutPage } from './pages/CheckoutPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PaymentStatusPage } from './pages/PaymentStatusPage'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/payment-status" element={<PaymentStatusPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
