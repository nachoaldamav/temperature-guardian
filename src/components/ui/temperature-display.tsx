import { Input } from '@/components/ui/input';
import { Label } from './label';

type TemperatureDisplayProps = {
  type: 'overall' | 'cpu' | 'gpu';
  temperature: number;
  threshold: number;
  onThresholdChange: (value: number) => void;
};

export default function TemperatureDisplay({
  type,
  temperature,
  threshold,
  onThresholdChange,
}: TemperatureDisplayProps) {
  const isWarning = temperature > threshold;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center space-y-2">
        <div className="flex items-center space-x-2">
          <div className="space-y-2">
            <Label htmlFor={`${type}-threshold`}>Set {type.toUpperCase()} Threshold</Label>
            <div className="relative border rounded-lg shadow-sm shadow-black/5 border-white/20 peer-disabled:border-transparent peer-disabled:bg-transparent">
              <Input
                className="peer pe-12"
                placeholder={temperature.toString()}
                type="number"
                value={threshold}
                onChange={(e) => onThresholdChange(Number(e.target.value))}
                id={`${type}-threshold`}
              />
              <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-3 text-sm text-muted-foreground peer-disabled:opacity-50">
                °C
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold">{type.toUpperCase()} Temperature</h2>
        <p
          className={`text-6xl font-bold ${isWarning ? 'text-red-500' : 'text-green-500'}`}
        >
          {temperature.toFixed(1)}°C
        </p>
      </div>
    </div>
  );
}
