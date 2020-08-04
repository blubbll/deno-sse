
import { Response, ServerRequest } from 'https://deno.land/std/http/server.ts'

export type PrefilledResponse = Response & { headers: Headers }

export interface Route {
  pathname: string,
  handler: (req: ServerRequest, res: PrefilledResponse) => void
}

export class Router {
  routes: Route[] = []

  constructor () {}

  add (pathname: string, handler: (req: ServerRequest, res: PrefilledResponse) => Promise<void>) {
    const route: Route = { pathname, handler }
    this.routes.push(route)
  }

  match (pathname: string): Route | null {
    for (const route of this.routes) {
      if (route.pathname === pathname) return route
    }
    return null
  }
}