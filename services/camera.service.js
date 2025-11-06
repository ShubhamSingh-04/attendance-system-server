const fetchCameraImage = async (cameraUrl) => {
  // Make a GET request to the camera's snapshot URL
  // We set responseType to 'stream' so axios gives us the data as it comes in
  const response = await axios.get(cameraUrl, {
    responseType: 'stream',
  });

  // Return the stream data
  return response.data;
};

export default {
  fetchCameraImage,
};
