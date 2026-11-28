import { useQuery } from '@tanstack/react-query';
import { portfoliosService } from '../../../shared/services/portfoliosService.js';
import { type PortfoliosControllerFindAllParams } from '../../../api/generated/debts_models/index.js';

export const usePortfolios = (params?: PortfoliosControllerFindAllParams) => {
  return useQuery({
    queryKey: ['portfolios', params],
    queryFn: () => portfoliosService.listPortfolios(params),
    staleTime: 30000,
  });
};
