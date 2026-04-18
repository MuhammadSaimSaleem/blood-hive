import { Directory, File } from 'expo-file-system';

export const cacheProfileImage = async (remoteUrl, userId) => {
  if (!remoteUrl) return null;

  // Define the local path using the new Directory class
  const file = new File(Directory.document, `${userId}_profile.png`);

  try {
    // Check if the file exists using the new .exists property
    if (file.exists) {
      return file.uri; // Return local path immediately
    }

    // If it doesn't exist, download it
    // Note: If your version requires the legacy downloader for now, 
    // you can still use createDownloadResumable but point to file.uri
    const downloadResumable = FileSystem.createDownloadResumable(
      remoteUrl,
      file.uri,
      {}
    );

    const { uri } = await downloadResumable.downloadAsync();
    return uri; 
  } catch (e) {
    console.error("Image Cache Error:", e);
    return remoteUrl; // Fallback to remote URL
  }
};