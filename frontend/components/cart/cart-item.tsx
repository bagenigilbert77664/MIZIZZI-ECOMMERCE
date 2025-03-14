"use client"

import type React from "react"

interface CartItemProps {
  item: {
    id: number
    product_id: number
    variant_id?: number | null
    quantity: number
    price: number
    total: number
    product: {
      id: number
      name: string
      slug: string
      thumbnail_url: string
      image_urls: string[]
    }
  }
  onUpdateQuantity: (id: number, quantity: number) => void
  onRemove: (id: number) => void
}

const CartItem: React.FC<CartItemProps> = ({ item, onUpdateQuantity, onRemove }) => {
  const { id, quantity, price, total, product } = item

  const handleQuantityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = Number.parseInt(event.target.value)
    if (!isNaN(newQuantity) && newQuantity > 0) {
      onUpdateQuantity(id, newQuantity)
    }
  }

  return (
    <div className="cart-item">
      <div className="cart-item__image">
        <img src={product.thumbnail_url || "/placeholder.svg"} alt={product.name} />
      </div>
      <div className="cart-item__details">
        <h3 className="cart-item__name">{product.name}</h3>
        <p className="cart-item__price">Price: ${price}</p>
        <div className="cart-item__quantity">
          <label htmlFor={`quantity-${id}`}>Quantity:</label>
          <input type="number" id={`quantity-${id}`} value={quantity} min="1" onChange={handleQuantityChange} />
        </div>
        <p className="cart-item__total">Total: ${total}</p>
        <button className="cart-item__remove" onClick={() => onRemove(id)}>
          Remove
        </button>
      </div>
    </div>
  )
}

export default CartItem

