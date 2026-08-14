export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  targetPath: string;
  createdAt: string;
  readAt: string | null;
};
