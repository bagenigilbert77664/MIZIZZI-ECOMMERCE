"use client"

import type React from "react"

import { createContext, useContext, useReducer, type ReactNode, useState, useLayoutEffect } from "react"

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  image: string
}

interface WishlistItem {
  id: number
  name: string
  price: number
  image: string
}

interface State {
  cart: CartItem[]
  wishlist: WishlistItem[]
}

type Action =
  | { type: "ADD_TO_CART"; payload: CartItem }
  | { type: "REMOVE_FROM_CART"; payload: number }
  | { type: "UPDATE_QUANTITY"; payload: { id: number; quantity: number } }
  | { type: "TOGGLE_WISHLIST"; payload: WishlistItem }

const initialState: State = {
  cart: [],
  wishlist: [],
}

const StateContext = createContext<
  | {
      state: State
      dispatch: React.Dispatch<Action>
    }
  | undefined
>(undefined)

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_TO_CART":
      const existingItem = state.cart.find((item) => item.id === action.payload.id)
      if (existingItem) {
        return {
          ...state,
          cart: state.cart.map((item) =>
            item.id === action.payload.id ? { ...item, quantity: item.quantity + action.payload.quantity } : item,
          ),
        }
      }
      return {
        ...state,
        cart: [...state.cart, action.payload],
      }

    case "REMOVE_FROM_CART":
      return {
        ...state,
        cart: state.cart.filter((item) => item.id !== action.payload),
      }

    case "UPDATE_QUANTITY":
      return {
        ...state,
        cart: state.cart.map((item) =>
          item.id === action.payload.id ? { ...item, quantity: action.payload.quantity } : item,
        ),
      }

    case "TOGGLE_WISHLIST":
      const existingWishlistItem = state.wishlist.find((item) => item.id === action.payload.id)
      return {
        ...state,
        wishlist: existingWishlistItem
          ? state.wishlist.filter((item) => item.id !== action.payload.id)
          : [...state.wishlist, action.payload],
      }

    default:
      return state
  }
}

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [state, dispatch] = useReducer(reducer, initialState)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return <StateContext.Provider value={{ state, dispatch }}>{children}</StateContext.Provider>
}

export function useStateContext() {
  const context = useContext(StateContext)
  if (context === undefined) {
    throw new Error("useStateContext must be used within a StateProvider")
  }
  return context
}
