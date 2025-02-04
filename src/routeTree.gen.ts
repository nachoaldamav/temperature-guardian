/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as PopupImport } from './routes/popup'
import { Route as IndexImport } from './routes/index'

// Create/Update Routes

const PopupRoute = PopupImport.update({
  id: '/popup',
  path: '/popup',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/popup': {
      id: '/popup'
      path: '/popup'
      fullPath: '/popup'
      preLoaderRoute: typeof PopupImport
      parentRoute: typeof rootRoute
    }
  }
}

// Create and export the route tree

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/popup': typeof PopupRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/popup': typeof PopupRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/popup': typeof PopupRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/popup'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/popup'
  id: '__root__' | '/' | '/popup'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  PopupRoute: typeof PopupRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  PopupRoute: PopupRoute,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/popup"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/popup": {
      "filePath": "popup.tsx"
    }
  }
}
ROUTE_MANIFEST_END */
