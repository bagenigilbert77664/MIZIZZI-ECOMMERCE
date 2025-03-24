"use client"

import type React from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { CreditCard, Truck, Phone, Info } from "lucide-react"

interface CheckoutPaymentProps {
  formData: any
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  errors: Record<string, string>
}

export function CheckoutPayment({ formData, handleChange, errors }: CheckoutPaymentProps) {
  // Handle radio button changes
  const handleRadioChange = (name: string, value: string) => {
    handleChange({
      target: { name, value },
    } as React.ChangeEvent<HTMLInputElement>)
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="space-y-4">
          <Label className="text-base">Payment Method</Label>
          <div className="grid grid-cols-1 gap-4 pt-2">
            <div
              className={`relative rounded-lg border-2 ${
                formData.paymentMethod === "cash_on_delivery"
                  ? "border-cherry-900 bg-cherry-50/50"
                  : "border-transparent bg-gray-50 hover:bg-gray-100"
              } p-6 transition-all cursor-pointer shadow-sm hover:shadow`}
              onClick={() => handleRadioChange("paymentMethod", "cash_on_delivery")}
            >
              <div className="absolute top-4 right-4">
                <div
                  className={`h-5 w-5 rounded-full border-2 ${
                    formData.paymentMethod === "cash_on_delivery"
                      ? "border-cherry-900 bg-cherry-900"
                      : "border-gray-300"
                  } flex items-center justify-center transition-colors duration-200`}
                >
                  {formData.paymentMethod === "cash_on_delivery" && (
                    <div className="h-2 w-2 rounded-full bg-white"></div>
                  )}
                </div>
              </div>
              <div className="flex items-center">
                <div className="mr-4 h-16 w-16 flex items-center justify-center rounded-full bg-cherry-100 shadow-sm">
                  <Truck className="h-8 w-8 text-cherry-900" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Pay After Delivery</h3>
                  <p className="text-sm text-gray-600">Pay with cash when your order arrives</p>
                </div>
              </div>
            </div>

            <div
              className={`relative rounded-lg border-2 ${
                formData.paymentMethod === "mpesa"
                  ? "border-cherry-900 bg-cherry-50/50"
                  : "border-transparent bg-gray-50 hover:bg-gray-100"
              } p-6 transition-all cursor-pointer shadow-sm hover:shadow`}
              onClick={() => handleRadioChange("paymentMethod", "mpesa")}
            >
              <div className="absolute top-4 right-4">
                <div
                  className={`h-5 w-5 rounded-full border-2 ${
                    formData.paymentMethod === "mpesa" ? "border-cherry-900 bg-cherry-900" : "border-gray-300"
                  } flex items-center justify-center transition-colors duration-200`}
                >
                  {formData.paymentMethod === "mpesa" && <div className="h-2 w-2 rounded-full bg-white"></div>}
                </div>
              </div>
              <div className="flex items-center">
                <div className="mr-4 h-16 w-16 flex items-center justify-center rounded-full bg-green-100 shadow-sm">
                  <Phone className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">M-Pesa</h3>
                  <p className="text-sm text-gray-600">Pay via M-Pesa mobile money</p>
                </div>
              </div>
            </div>

            <div
              className={`relative rounded-lg border-2 ${
                formData.paymentMethod === "credit-card"
                  ? "border-cherry-900 bg-cherry-50/50"
                  : "border-transparent bg-gray-50 hover:bg-gray-100"
              } p-6 transition-all cursor-pointer shadow-sm hover:shadow`}
              onClick={() => handleRadioChange("paymentMethod", "credit-card")}
            >
              <div className="absolute top-4 right-4">
                <div
                  className={`h-5 w-5 rounded-full border-2 ${
                    formData.paymentMethod === "credit-card" ? "border-cherry-900 bg-cherry-900" : "border-gray-300"
                  } flex items-center justify-center transition-colors duration-200`}
                >
                  {formData.paymentMethod === "credit-card" && <div className="h-2 w-2 rounded-full bg-white"></div>}
                </div>
              </div>
              <div className="flex items-center">
                <div className="mr-4 h-16 w-16 flex items-center justify-center rounded-full bg-blue-100 shadow-sm">
                  <CreditCard className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Credit Card</h3>
                  <p className="text-sm text-gray-600">Pay with Visa, Mastercard, etc.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Information Box */}
      <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-gray-800">Payment Information</h3>

        {formData.paymentMethod === "mpesa" && (
          <div className="space-y-3 text-sm">
            <p className="font-semibold text-gray-700">OUR MPESA PAYMENT DETAILS:</p>
            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex justify-between mb-3 border-b border-gray-100 pb-3">
                <span className="text-gray-600 font-medium">PAYBILL:</span>
                <span className="font-semibold text-primary">247247</span>
              </div>
              <div className="flex justify-between mb-3 border-b border-gray-100 pb-3">
                <span className="text-gray-600 font-medium">ACCOUNT:</span>
                <span className="font-semibold text-primary">100443</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">CONFIRMATION:</span>
                <span className="font-semibold text-primary">MIZIZZI STORE</span>
              </div>
            </div>
          </div>
        )}

        {formData.paymentMethod === "cash_on_delivery" && (
          <div className="space-y-3 text-sm">
            <div className="flex items-start bg-blue-50 p-4 rounded-lg">
              <div className="mr-3 mt-1 flex-shrink-0">
                <Info className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-blue-700 leading-relaxed">
                Our Customer Service Agents will call you immediately after you place an order to confirm details. Have
                your payment ready when your order arrives.
              </p>
            </div>
          </div>
        )}

        {formData.paymentMethod === "credit-card" && (
          <div className="space-y-4">
            <div>
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  name="cardNumber"
                  value={formData.cardNumber}
                  onChange={handleChange}
                  placeholder="1234 5678 9012 3456"
                  className={errors.cardNumber ? "border-red-500" : ""}
                />
                {errors.cardNumber && <p className="text-sm text-red-500 mt-1">{errors.cardNumber}</p>}
              </div>
            </div>

            <div>
              <div className="space-y-2">
                <Label htmlFor="cardName">Name on Card</Label>
                <Input
                  id="cardName"
                  name="cardName"
                  value={formData.cardName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className={errors.cardName ? "border-red-500" : ""}
                />
                {errors.cardName && <p className="text-sm text-red-500 mt-1">{errors.cardName}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleChange}
                    placeholder="MM/YY"
                    className={errors.expiryDate ? "border-red-500" : ""}
                  />
                  {errors.expiryDate && <p className="text-sm text-red-500 mt-1">{errors.expiryDate}</p>}
                </div>
              </div>

              <div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    name="cvv"
                    value={formData.cvv}
                    onChange={handleChange}
                    placeholder="123"
                    className={errors.cvv ? "border-red-500" : ""}
                  />
                  {errors.cvv && <p className="text-sm text-red-500 mt-1">{errors.cvv}</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t pt-6 mt-6">
        <div className="flex items-start space-x-2 mb-4">
          <Checkbox
            id="sameAsShipping"
            name="sameAsShipping"
            checked={formData.sameAsShipping}
            onCheckedChange={(checked) => {
              handleChange({
                target: {
                  name: "sameAsShipping",
                  type: "checkbox",
                  checked: checked === true,
                },
              } as React.ChangeEvent<HTMLInputElement>)
            }}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="sameAsShipping"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Billing address same as shipping address
            </Label>
            <p className="text-sm text-gray-500">Uncheck this if you need to enter a different billing address</p>
          </div>
        </div>

        {!formData.sameAsShipping && (
          <div className="space-y-4 mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="font-semibold text-gray-800 mb-2">Billing Address</h3>

            <div>
              <div className="space-y-2">
                <Label htmlFor="billingAddress">Address</Label>
                <Input
                  id="billingAddress"
                  name="billingAddress"
                  value={formData.billingAddress}
                  onChange={handleChange}
                  placeholder="123 Main St"
                  className={errors.billingAddress ? "border-red-500" : ""}
                />
                {errors.billingAddress && <p className="text-sm text-red-500 mt-1">{errors.billingAddress}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="space-y-2">
                  <Label htmlFor="billingCity">City</Label>
                  <Input
                    id="billingCity"
                    name="billingCity"
                    value={formData.billingCity}
                    onChange={handleChange}
                    placeholder="Nairobi"
                    className={errors.billingCity ? "border-red-500" : ""}
                  />
                  {errors.billingCity && <p className="text-sm text-red-500 mt-1">{errors.billingCity}</p>}
                </div>
              </div>

              <div>
                <div className="space-y-2">
                  <Label htmlFor="billingState">County/State</Label>
                  <Input
                    id="billingState"
                    name="billingState"
                    value={formData.billingState}
                    onChange={handleChange}
                    placeholder="Nairobi"
                    className={errors.billingState ? "border-red-500" : ""}
                  />
                  {errors.billingState && <p className="text-sm text-red-500 mt-1">{errors.billingState}</p>}
                </div>
              </div>

              <div>
                <div className="space-y-2">
                  <Label htmlFor="billingZipCode">Postal Code</Label>
                  <Input
                    id="billingZipCode"
                    name="billingZipCode"
                    value={formData.billingZipCode}
                    onChange={handleChange}
                    placeholder="00100"
                    className={errors.billingZipCode ? "border-red-500" : ""}
                  />
                  {errors.billingZipCode && <p className="text-sm text-red-500 mt-1">{errors.billingZipCode}</p>}
                </div>
              </div>
            </div>

            <div>
              <div className="space-y-2">
                <Label htmlFor="billingCountry">Country</Label>
                <Input
                  id="billingCountry"
                  name="billingCountry"
                  value={formData.billingCountry}
                  onChange={handleChange}
                  placeholder="Kenya"
                  className={errors.billingCountry ? "border-red-500" : ""}
                />
                {errors.billingCountry && <p className="text-sm text-red-500 mt-1">{errors.billingCountry}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CheckoutPayment

