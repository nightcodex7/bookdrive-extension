// Shared types for BookDrive bookmarks

export interface BookmarkNode {
  id: string;
  title: string;
  url?: string;
  parentId?: string;
  children?: BookmarkNode[];
}

export type BookmarkTree = BookmarkNode[];

export interface Folder {
  id: string;
  title: string;
  parentId?: string | null;
  children?: BookmarkNode[];
}

export interface BookmarkState {
  folders: Folder[];
  bookmarks: BookmarkNode[];
  device: string;
  timestamp: string;
  hash: number;
}
