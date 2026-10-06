/**
 * Route -> service mapping, used by the analytics intent adapter.
 *
 * Kept out of the analytics module so the mapping is a data concern and can be
 * unit tested on its own.
 */

import { routes, type ServiceKey } from '../data/site.js';

const BY_ROUTE: Readonly<Record<string, ServiceKey>> = {
  [routes.servicos]: 'servicos',
  [routes.instalacao]: 'instalacao',
  [routes.predios]: 'instalacao',
  [routes.altura]: 'altura',
  [routes.manutencao]: 'manutencao',
  [routes.limpeza]: 'limpeza',
  [routes.pex]: 'pex',
};

export function serviceKeyForPath(pathname: string): ServiceKey | undefined {
  return BY_ROUTE[pathname];
}