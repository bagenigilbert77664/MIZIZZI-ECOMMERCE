"use client"

import { useState, useEffect } from "react"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"

export function SoundSettings() {
  const [soundEnabled, setSoundEnabled] = useLocalStorage<boolean>("cartSoundEnabled", true)
  const [soundFile, setSoundFile] = useLocalStorage<string>("cartSoundFile", "/cart-success.mp3")
  const [testAudio, setTestAudio] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    setTestAudio(new Audio(soundFile))
  }, [soundFile])

  const handleSoundToggle = () => {
    setSoundEnabled(!soundEnabled)
    toast({
      title: "Sound settings updated",
      description: `Cart sounds ${soundEnabled ? "disabled" : "enabled"}`,
    })
  }

  const handleSoundFileChange = (newSoundFile: string) => {
    setSoundFile(newSoundFile)
    toast({
      title: "Sound file changed",
      description: "New cart sound selected",
    })
  }

  const handleTestSound = () => {
    if (testAudio) {
      testAudio.volume = 0.5
      testAudio.play().catch((err) => console.log("Audio play failed:", err))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sound Settings</CardTitle>
        <CardDescription>Customize your cart notification sounds</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Enable Cart Sounds</p>
            <p className="text-xs text-muted-foreground">Play a sound when an item is added to the cart</p>
          </div>
          <Switch id="sound-enabled" checked={soundEnabled} onCheckedChange={handleSoundToggle} />
        </div>

        <div className="space-y-2">
          <label htmlFor="sound-file" className="text-sm font-medium block">
            Cart Sound File
          </label>
          <Select value={soundFile} onValueChange={handleSoundFileChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a sound" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="/cart-success.mp3">Success</SelectItem>
              <SelectItem value="/notification.mp3">Notification</SelectItem>
              <SelectItem value="/ding.mp3">Ding</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleTestSound} disabled={!soundEnabled}>
            Test Sound
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
