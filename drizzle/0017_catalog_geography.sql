ALTER TABLE complexes ADD COLUMN latitude REAL NOT NULL DEFAULT 39.6542;
ALTER TABLE complexes ADD COLUMN longitude REAL NOT NULL DEFAULT 66.9597;

UPDATE complexes SET latitude = 39.6828, longitude = 66.9442 WHERE id = 'complex-bogishamol';
UPDATE complexes SET latitude = 39.6548, longitude = 66.9757 WHERE id = 'complex-registan';
UPDATE complexes SET latitude = 39.6765, longitude = 66.9895 WHERE id = 'complex-silk-road';
UPDATE complexes SET latitude = 39.6403, longitude = 66.9015 WHERE id = 'complex-afrasiyob';
UPDATE complexes SET latitude = 39.6608, longitude = 66.9468 WHERE id = 'complex-samarkand-city';
UPDATE complexes SET latitude = 39.6750, longitude = 67.0540 WHERE id = 'complex-zarafshan';

CREATE INDEX IF NOT EXISTS idx_complexes_geo ON complexes(latitude, longitude);

PRAGMA optimize;
