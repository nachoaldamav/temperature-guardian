import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Cpu, Gauge, Thermometer } from 'lucide-react';
import { queryTemperatures, queryThresholds } from '@/lib/queries';
import { useSuspenseQuery, useMutation } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import TemperatureDisplay from '@/components/ui/temperature-display';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { queryClient } from '@/lib/client';
import { invoke } from '@tauri-apps/api/core';

// Mutation to set thresholds in the backend
const setThresholds = async ({
  cpuThreshold,
  gpuThreshold,
  overallThreshold,
}: {
  cpuThreshold?: number;
  gpuThreshold?: number;
  overallThreshold?: number;
}) => {
  await invoke('set_thresholds', {
    newCpuThreshold: cpuThreshold,
    newGpuThreshold: gpuThreshold,
    newOverallThreshold: overallThreshold,
  });
};

type TemperatureType = 'overall' | 'cpu' | 'gpu';

export const Route = createFileRoute('/')({
  component: Index,

  loader: async () => {
    await queryClient.ensureQueryData(queryTemperatures);
    await queryClient.ensureQueryData(queryThresholds);
  },
});

function Index() {
  const [activeTab, setActiveTab] = useState<TemperatureType>('overall');
  const { data: temps } = useSuspenseQuery(queryTemperatures);
  const { data: thresholds } = useSuspenseQuery(queryThresholds);

  const mutation = useMutation({
    mutationFn: setThresholds,
    onSuccess: () => {
      queryClient.invalidateQueries(queryThresholds);
    },
  });

  const [localThresholds, setLocalThresholds] = useState({
    overall: thresholds.overallThreshold,
    cpu: thresholds.cpuThreshold,
    gpu: thresholds.gpuThreshold,
  });

  const [debouncedThresholds, setDebouncedThresholds] = useState(localThresholds);

  const lastSavedThresholds = useRef(localThresholds);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedThresholds(localThresholds);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [localThresholds]);

  useEffect(() => {
    if (
      debouncedThresholds.cpu !== lastSavedThresholds.current.cpu ||
      debouncedThresholds.gpu !== lastSavedThresholds.current.gpu ||
      debouncedThresholds.overall !== lastSavedThresholds.current.overall
    ) {
      mutation.mutate({
        cpuThreshold: debouncedThresholds.cpu,
        gpuThreshold: debouncedThresholds.gpu,
        overallThreshold: debouncedThresholds.overall,
      });
      lastSavedThresholds.current = debouncedThresholds; // Update last saved thresholds
    }
  }, [debouncedThresholds, mutation]);

  const temperatures = {
    overall: (temps[0] + temps[1]) / 2,
    cpu: temps[0],
    gpu: temps[1],
  };

  const handleThresholdChange = (type: TemperatureType, value: number) => {
    setLocalThresholds((prev) => ({ ...prev, [type]: value }));
  };

  const showWarning = temperatures[activeTab] > localThresholds[activeTab];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto bg-gray-800 text-white shadow-2xl border-gray-700">
        <CardContent className="p-6">
          <h1 className="text-3xl font-bold text-center mb-6 flex items-center justify-center">
            <Thermometer className="mr-2" /> Temperature Monitor
          </h1>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as TemperatureType)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-700 p-1 rounded-lg">
              <TabsTrigger
                value="overall"
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-gray-300 rounded-md transition-all duration-200 ease-in-out"
              >
                <Gauge className="mr-2 h-4 w-4" /> Overall
              </TabsTrigger>
              <TabsTrigger
                value="cpu"
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-gray-300 rounded-md transition-all duration-200 ease-in-out"
              >
                <Cpu className="mr-2 h-4 w-4" /> CPU
              </TabsTrigger>
              <TabsTrigger
                value="gpu"
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-gray-300 rounded-md transition-all duration-200 ease-in-out"
              >
                <Thermometer className="mr-2 h-4 w-4" /> GPU
              </TabsTrigger>
            </TabsList>
            {(['overall', 'cpu', 'gpu'] as const).map((type) => (
              <TabsContent key={type} value={type} className="mt-0">
                <TemperatureDisplay
                  type={type}
                  temperature={temperatures[type]}
                  threshold={localThresholds[type]}
                  onThresholdChange={(value) =>
                    handleThresholdChange(type, value)
                  }
                />
              </TabsContent>
            ))}
          </Tabs>
          {showWarning && (
            <Alert
              variant="destructive"
              className="mt-6 bg-red-900 border-red-700 text-white animate-pulse"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                {activeTab.toUpperCase()} temperature has exceeded the
                threshold!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
