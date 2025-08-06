import { cn } from "@/lib/utils"

interface PasswordStrengthProps {
  strength: number // 0-4 where 0 is no password and 4 is very strong
}

export function PasswordStrength({ strength }: PasswordStrengthProps) {
  return (
    <div className="mt-1 space-y-1">
      <div className="flex gap-1">
        <div
          className={cn("h-1 w-1/4 rounded-full", {
            "bg-red-500": strength >= 1,
            "bg-gray-200": strength < 1,
          })}
        />
        <div
          className={cn("h-1 w-1/4 rounded-full", {
            "bg-orange-500": strength >= 2,
            "bg-gray-200": strength < 2,
          })}
        />
        <div
          className={cn("h-1 w-1/4 rounded-full", {
            "bg-yellow-500": strength >= 3,
            "bg-gray-200": strength < 3,
          })}
        />
        <div
          className={cn("h-1 w-1/4 rounded-full", {
            "bg-green-500": strength >= 4,
            "bg-gray-200": strength < 4,
          })}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {strength === 0 && "Enter a password"}
        {strength === 1 && "Weak password"}
        {strength === 2 && "Fair password"}
        {strength === 3 && "Good password"}
        {strength === 4 && "Strong password"}
      </p>
    </div>
  )
}
