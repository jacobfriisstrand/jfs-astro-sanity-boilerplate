export type BunnyVideo = {
  guid: string;
  title: string;
  length: number;
  status: number;
  libraryId: number;
};

export type BunnyVideoResponse = {
  items?: BunnyVideo[];
  totalItems?: number;
  currentPage?: number;
  itemsPerPage?: number;
  error?: string;
};

export type BunnyStorageFile = {
  Guid: string;
  StorageZoneName: string;
  Path: string;
  ObjectName: string;
  Length: number;
  LastChanged: string;
  IsDirectory: boolean;
  ServerId: number;
  ArrayNumber: number;
  DateCreated: string;
  UserId: string;
  ContentType: string;
  StorageZoneId: number;
  Checksum: string;
  ReplicatedZones: string;
  // Full relative path in the storage zone, e.g. "/images/foo.jpg"
  storagePath: string;
  cdnUrl: string;
  thumbnailUrl: string;
};
