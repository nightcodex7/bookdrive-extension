import type { BookmarkNode, BookmarkState } from './bookmarks';

export const createMockBookmarkTree = (): BookmarkNode[] => [
    {
        id: '1',
        title: 'Root',
        children: [
            {
                id: '2',
                title: 'Folder 1',
                children: [
                    {
                        id: '3',
                        title: 'Bookmark 1',
                        url: 'https://example.com'
                    }
                ]
            }
        ]
    }
];

export const createMockSyncLog = () => ({
    time: new Date().toISOString(),
    mode: 'host',
    status: 'success'
});
