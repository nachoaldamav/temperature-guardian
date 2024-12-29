import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { queryClient } from '@/lib/client'
import { queryTemperatures } from '@/lib/queries'
import {  useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { Thermometer, Cpu, CpuIcon as Gpu, X } from 'lucide-react'

interface TemperatureData {
  overall: number
  cpu: number
  gpu: number
}

export const Route = createFileRoute('/popup')({
  component: RouteComponent,

  loader: async () => queryClient.ensureQueryData(queryTemperatures)
})

function RouteComponent() {
  const { data: temps } = useSuspenseQuery(queryTemperatures)

  const temperatureData: TemperatureData = {
    overall: (temps[0] + temps[1]) / 2,
    cpu: temps[0],
    gpu: temps[1]
  }

  return (
    <Alert className="w-full h-full mx-auto bg-gradient-to-r from-yellow-100 to-red-100 border-yellow-400 dark:from-yellow-900 dark:to-red-900 dark:border-yellow-600 relative">
      <button 
        type="button"
        onClick={async () => await invoke('close_popup')}
        className="absolute top-2 right-2 text-yellow-800 dark:text-yellow-200 hover:text-yellow-600 dark:hover:text-yellow-400"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
      <Thermometer className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-200 mb-2">Temperature Warning</AlertTitle>
      <AlertDescription>
        <div className="text-yellow-700 dark:text-yellow-300 space-y-1">
          <p className="font-semibold">System temperature is increasing. Please check your computer's ventilation.</p>
          <div className="flex items-center space-x-2">
            <Thermometer className="h-4 w-4" />
            <span>Overall: {temperatureData.overall}°C</span>
          </div>
          <div className="flex items-center space-x-2">
            <Cpu className="h-4 w-4" />
            <span>CPU: {temperatureData.cpu}°C</span>
          </div>
          <div className="flex items-center space-x-2">
            <Gpu className="h-4 w-4" />
            <span>GPU: {temperatureData.gpu}°C</span>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}
