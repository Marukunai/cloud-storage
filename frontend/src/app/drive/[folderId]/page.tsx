import { FileExplorer } from "@/components/FileExplorer/FileExplorer";

export default function DriveFolderPage({ params }: { params: { folderId: string } }) {
  return <FileExplorer folderId={params.folderId} />;
}
