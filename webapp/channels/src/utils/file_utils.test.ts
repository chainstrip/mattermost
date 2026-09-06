// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as UserAgent from '@mattermost/shared/utils/user_agent';

import {
    trimFilename,
    canUploadFiles,
    getFileTypeFromMime,
    getOrientationStyles,
} from 'utils/file_utils';

const isMobileMock = jest.mocked(UserAgent.isMobile);
jest.mock('@mattermost/shared/utils/user_agent', () => ({
    isMobile: jest.fn(() => false),
}));

describe('FileUtils.trimFilename', () => {
    it('trimFilename: should return same filename', () => {
        expect(trimFilename('abcdefghijklmnopqrstuvwxyz')).toBe('abcdefghijklmnopqrstuvwxyz');
    });

    it('trimFilename: should return trimmed filename', () => {
        expect(trimFilename('abcdefghijklmnopqrstuvwxyz0123456789')).toBe('abcdefghijklmnopqrstuvwxyz012345678...');
    });
});

describe('FileUtils.canUploadFiles', () => {
    isMobileMock.mockReturnValue(false);

    it('is false when file attachments are disabled', () => {
        const config = {
            EnableFileAttachments: 'false',
            EnableMobileFileUpload: 'true',
        };
        expect(canUploadFiles(config)).toBe(false);
    });

    describe('is true when file attachments are enabled', () => {
        isMobileMock.mockReturnValue(false);

        it('and not on mobile', () => {
            isMobileMock.mockReturnValue(false);

            const config = {
                EnableFileAttachments: 'true',
                EnableMobileFileUpload: 'false',
            };
            expect(canUploadFiles(config)).toBe(true);
        });

        it('and on mobile with mobile file upload enabled', () => {
            isMobileMock.mockReturnValue(true);

            const config = {
                EnableFileAttachments: 'true',
                EnableMobileFileUpload: 'true',
            };
            expect(canUploadFiles(config)).toBe(true);
        });

        it('unless on mobile with mobile file upload disabled', () => {
            isMobileMock.mockReturnValue(true);

            const config = {
                EnableFileAttachments: 'true',
                EnableMobileFileUpload: 'false',
            };
            expect(canUploadFiles(config)).toBe(false);
        });
    });

    describe('get filetypes based on mime interpreted from browsers', () => {
        it('mime type for videos', () => {
            expect(getFileTypeFromMime('video/mp4')).toBe('video');
        });

        it('mime type for audio', () => {
            expect(getFileTypeFromMime('audio/mp3')).toBe('audio');
        });

        it('mime type for image', () => {
            expect(getFileTypeFromMime('image/JPEG')).toBe('image');
        });

        it('mime type for pdf', () => {
            expect(getFileTypeFromMime('application/pdf')).toBe('pdf');
        });

        it('mime type for spreadsheet', () => {
            expect(getFileTypeFromMime('application/vnd.ms-excel')).toBe('spreadsheet');
        });

        it('mime type for presentation', () => {
            expect(getFileTypeFromMime('application/vnd.ms-powerpoint')).toBe('presentation');
        });

        it('mime type for word', () => {
            expect(getFileTypeFromMime('application/vnd.ms-word')).toBe('word');
        });

        it('mime type for unknown file format', () => {
            expect(getFileTypeFromMime('application/unknownFormat')).toBe('other');
        });

        it('mime type for no suffix', () => {
            expect(getFileTypeFromMime('asdasd')).toBe('other');
        });
    });
});

describe('FileUtils.getOrientationStyles', () => {
    it('should return no transform for the upright orientations', () => {
        expect(getOrientationStyles(1)).toEqual({transform: undefined, transformOrigin: undefined});
        expect(getOrientationStyles(0)).toEqual({transform: undefined, transformOrigin: undefined});
    });

    it('should rotate and flip according to the EXIF orientation', () => {
        expect(getOrientationStyles(2)).toEqual({transform: 'rotateY(180deg)', transformOrigin: undefined});
        expect(getOrientationStyles(3)).toEqual({transform: 'rotate(180deg)', transformOrigin: undefined});
        expect(getOrientationStyles(4)).toEqual({transform: 'rotate(180deg) rotateY(180deg)', transformOrigin: undefined});
    });

    it('should move the transform origin for the orientations that swap width and height', () => {
        expect(getOrientationStyles(5)).toEqual({transform: 'rotate(270deg) rotateY(180deg)', transformOrigin: 'top left'});
        expect(getOrientationStyles(6)).toEqual({transform: 'translateY(-100%) rotate(90deg)', transformOrigin: 'bottom left'});
        expect(getOrientationStyles(7)).toEqual({transform: 'translateY(-100%) translateX(-100%) rotate(90deg) rotateY(180deg)', transformOrigin: 'bottom right'});
        expect(getOrientationStyles(8)).toEqual({transform: 'translateX(-100%) rotate(270deg)', transformOrigin: 'top right'});
    });
});
