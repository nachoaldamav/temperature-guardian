import { queryOptions } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export const queryTemperatures = queryOptions({
  queryKey: ['temperatures'],
  queryFn: async () => invoke<[number, number]>('get_temperatures'),
  staleTime: 0,
  refetchInterval: 1000
})

export const queryThresholds = queryOptions({
  queryKey: ['thresholds'],
  queryFn: async () => {
    const data = await invoke<[number, number, number]>('get_thresholds');
    return {
      cpuThreshold: data[0],
      gpuThreshold: data[1],
      overallThreshold: data[2],
    };
  },
});
