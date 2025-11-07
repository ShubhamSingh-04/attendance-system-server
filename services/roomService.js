import { Room } from '../models/Room.js';
import { Camera } from '../models/Camera.js';

/**
 * Creates a new Room and optionally creates associated cameras.
 * Implements manual transaction/rollback.
 */
const addRoom = async (roomData) => {
  const { name, description, cameras } = roomData;

  // --- 1. Create Room ---
  const newRoom = new Room({
    name,
    description,
  });

  let savedRoom;
  const createdCameraIds = []; // Keep track of cameras to roll back

  try {
    // Check for duplicate room name before saving
    const existingRoom = await Room.findOne({ name });
    if (existingRoom) {
      throw new Error('A room with this name already exists.');
    }
    savedRoom = await newRoom.save();

    // --- 2. Create Cameras (if provided) ---
    if (cameras && Array.isArray(cameras) && cameras.length > 0) {
      for (const camData of cameras) {
        // Basic validation for camera data
        if (!camData.cameraId || !camData.cameraAccessLink) {
          throw new Error(
            'Invalid camera data: "cameraId" and "cameraAccessLink" are required.'
          );
        }

        // Check for duplicate camera IDs or links
        const existingCam = await Camera.findOne({
          $or: [
            { cameraId: camData.cameraId },
            { cameraAccessLink: camData.cameraAccessLink },
          ],
        });
        if (existingCam) {
          const duplicateKey =
            existingCam.cameraId === camData.cameraId
              ? 'cameraId'
              : 'cameraAccessLink';
          throw new Error(`A camera with this ${duplicateKey} already exists.`);
        }

        const newCamera = new Camera({
          ...camData,
          room: savedRoom._id, // Link to the new room
        });
        const savedCamera = await newCamera.save();
        createdCameraIds.push(savedCamera._id);
      }
    }

    // --- 3. Return Populated Room ---
    // Re-fetch the room to populate the virtual 'cameras'
    const populatedRoom = await Room.findById(savedRoom._id).populate(
      'cameras'
    );
    return populatedRoom;
  } catch (error) {
    // ---!! MANUAL ROLLBACK !! ---
    // If anything fails, delete what we've created
    console.error('Error during room/camera creation, rolling back...');
    if (createdCameraIds.length > 0) {
      await Camera.deleteMany({ _id: { $in: createdCameraIds } });
    }
    if (savedRoom) {
      await Room.findByIdAndDelete(savedRoom._id);
    }
    // Re-throw the original error to be caught by the controller
    throw error;
  }
};

/**
 * Fetches all Rooms and populates their virtual 'cameras' field.
 */
const getAllRooms = async () => {
  const rooms = await Room.find({})
    .select('-createdAt -updatedAt -__v')
    .populate('cameras', '-createdAt -updatedAt -__v');
  return rooms;
};

/**
 * Edits a Room's details.
 * Also "upserts" camera:
 * Only 1 Camera
 */
// This is your updated service function
const editRoom = async (roomId, updateData) => {
  // 1. Destructure 'camera' (singular object) instead of 'cameras' (plural array)
  const { name, description, camera: cameraData } = updateData;

  // --- 1. Find and Update Room Details ---
  const room = await Room.findById(roomId);
  if (!room) {
    throw new Error('Room not found.');
  }

  // If name is being updated, check it's not a duplicate
  if (name && name !== room.name) {
    const duplicate = await Room.findOne({ name, _id: { $ne: roomId } });
    if (duplicate) {
      throw new Error('A room with this name already exists.');
    }
    room.name = name;
  }

  if (description !== undefined) {
    room.description = description;
  }

  await room.save(); // Save room changes first

  // --- 2. Process Camera *Update* (NO ADDITIONS) ---

  // Only proceed if cameraData is provided as a non-array object
  if (
    cameraData &&
    typeof cameraData === 'object' &&
    !Array.isArray(cameraData)
  ) {
    // Find the ONE camera associated with this room
    const cameraToUpdate = await Camera.findOne({ room: room._id });

    // If no camera exists for this room, we cannot update it.
    if (!cameraToUpdate) {
      throw new Error(
        `No existing camera found for room ${room.name} to update.`
      );
    }

    // --- Apply Updates to the Existing Camera ---
    const fieldsToUpdate = {};
    // Only add fields to update if they were actually provided
    if (cameraData.cameraId) fieldsToUpdate.cameraId = cameraData.cameraId;
    if (cameraData.cameraAccessLink)
      fieldsToUpdate.cameraAccessLink = cameraData.cameraAccessLink;

    // Only run duplicate check and save if there are actual changes
    if (Object.keys(fieldsToUpdate).length > 0) {
      // Check for duplicates on OTHER cameras
      const query = { $or: [], _id: { $ne: cameraToUpdate._id } };
      if (fieldsToUpdate.cameraId)
        query.$or.push({ cameraId: fieldsToUpdate.cameraId });
      if (fieldsToUpdate.cameraAccessLink)
        query.$or.push({ cameraAccessLink: fieldsToUpdate.cameraAccessLink });

      if (query.$or.length > 0) {
        const duplicate = await Camera.findOne(query);
        if (duplicate) {
          const duplicateKey =
            duplicate.cameraId === fieldsToUpdate.cameraId
              ? 'cameraId'
              : 'cameraAccessLink';
          throw new Error(
            `A different camera with this ${duplicateKey} already exists.`
          );
        }
      }

      // Apply updates and save
      cameraToUpdate.set(fieldsToUpdate);
      await cameraToUpdate.save();
    }
  } else if (Array.isArray(cameraData)) {
    // Optionally, block the old array format to avoid confusion
    throw new Error(
      'Updating cameras via an array is not supported. Please send a single "camera" object.'
    );
  }

  // --- 3. Return updated room, populated with camera details ---
  // The virtual 'cameras' field will now pick up the updated camera
  const finalUpdatedRoom = await Room.findById(roomId)
    .populate('cameras', '-updatedAt -createdAt -__v')
    .select(' -__v -updatedAt -createdAt');
  return finalUpdatedRoom;
};

/**
 * Deletes a Room and performs a CASCADING DELETE on all associated cameras.
 */
const deleteRoom = async (roomId) => {
  // 1. Find the room to ensure it exists
  const room = await Room.findById(roomId);
  if (!room) {
    throw new Error('Room not found.');
  }

  // 2. Delete all cameras associated with this room
  await Camera.deleteMany({ room: roomId });

  // 3. Delete the room itself
  await Room.findByIdAndDelete(roomId);

  return { message: 'Room and all associated cameras deleted successfully.' };
};

export const roomService = {
  addRoom,
  getAllRooms,
  editRoom,
  deleteRoom,
};
