// team-manager.js - Team mode functionality for BookDrive

import { getAuthToken, ensureBookDriveFolder } from '../auth/drive-auth.js';
import { uploadFile, downloadFile, listFiles } from '../drive.js';

// Team metadata file name
const TEAM_METADATA_FILE = 'team_metadata.json';

/**
 * Get team members from Google Drive metadata
 * @returns {Promise<Array>} Array of team members
 */
export async function getTeamMembers() {
  try {
    const token = await getAuthToken(false);
    if (!token) {
      console.log('No authentication token available');
      return [];
    }

    // Ensure BookDrive folder exists
    const folderId = await ensureBookDriveFolder(false);
    if (!folderId) {
      console.log('BookDrive folder not found');
      return [];
    }

    // Look for team metadata file
    const files = await listFiles(
      folderId,
      token,
      `name='${TEAM_METADATA_FILE}' and mimeType='application/json'`,
    );

    if (files.length === 0) {
      console.log('No team metadata file found, creating initial team');
      return await createInitialTeam(folderId, token);
    }

    // Download team metadata
    const teamMetadata = await downloadFile(files[0].id, token);
    console.log('Team metadata loaded:', teamMetadata);

    return teamMetadata.members || [];
  } catch (error) {
    console.error('Failed to get team members:', error);
    return [];
  }
}

/**
 * Create initial team with current user as admin
 * @param {string} folderId - Google Drive folder ID
 * @param {string} token - Auth token
 * @returns {Promise<Array>} Initial team members
 */
async function createInitialTeam(folderId, token) {
  try {
    // Get current user info
    const userInfo = await getCurrentUserInfo();

    const initialTeam = {
      id: `team_${Date.now()}`,
      name: 'BookDrive Team',
      created: new Date().toISOString(),
      members: [
        {
          email: userInfo.email,
          deviceId: await getOrCreateDeviceId(),
          lastSync: new Date().toISOString(),
          role: 'admin',
          added: new Date().toISOString(),
        },
      ],
    };

    // Upload team metadata to Google Drive
    await uploadFile(TEAM_METADATA_FILE, initialTeam, folderId, token);

    console.log('Initial team created:', initialTeam);
    return initialTeam.members;
  } catch (error) {
    console.error('Failed to create initial team:', error);
    return [];
  }
}

/**
 * Add a team member
 * @param {string} email
 * @param {'admin'|'member'} role
 * @returns {Promise<Object>} Result
 */
export async function addTeamMember(email, role = 'member') {
  try {
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    // Ensure BookDrive folder exists
    const folderId = await ensureBookDriveFolder(true);

    // Get current team metadata
    const files = await listFiles(
      folderId,
      token,
      `name='${TEAM_METADATA_FILE}' and mimeType='application/json'`,
    );

    if (files.length === 0) {
      throw new Error('Team metadata not found');
    }

    const teamMetadata = await downloadFile(files[0].id, token);

    // Check if member already exists
    const existingMember = teamMetadata.members.find((m) => m.email === email);
    if (existingMember) {
      throw new Error('Team member already exists');
    }

    // Add new member
    const newMember = {
      email,
      deviceId: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastSync: null,
      role,
      added: new Date().toISOString(),
    };

    teamMetadata.members.push(newMember);
    teamMetadata.updated = new Date().toISOString();

    // Update team metadata in Google Drive
    await uploadFile(TEAM_METADATA_FILE, teamMetadata, folderId, token);

    console.log('Team member added:', newMember);
    return {
      success: true,
      member: newMember,
      message: `Team member ${email} added successfully`,
    };
  } catch (error) {
    console.error('Failed to add team member:', error);
    throw error;
  }
}

/**
 * Remove a team member
 * @param {string} email
 * @returns {Promise<Object>} Result
 */
export async function removeTeamMember(email) {
  try {
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    // Ensure BookDrive folder exists
    const folderId = await ensureBookDriveFolder(false);
    if (!folderId) {
      throw new Error('BookDrive folder not found');
    }

    // Get current team metadata
    const files = await listFiles(
      folderId,
      token,
      `name='${TEAM_METADATA_FILE}' and mimeType='application/json'`,
    );

    if (files.length === 0) {
      throw new Error('Team metadata not found');
    }

    const teamMetadata = await downloadFile(files[0].id, token);

    // Find and remove member
    const memberIndex = teamMetadata.members.findIndex((m) => m.email === email);
    if (memberIndex === -1) {
      throw new Error('Team member not found');
    }

    const removedMember = teamMetadata.members.splice(memberIndex, 1)[0];
    teamMetadata.updated = new Date().toISOString();

    // Update team metadata in Google Drive
    await uploadFile(TEAM_METADATA_FILE, teamMetadata, folderId, token);

    console.log('Team member removed:', removedMember);
    return {
      success: true,
      member: removedMember,
      message: `Team member ${email} removed successfully`,
    };
  } catch (error) {
    console.error('Failed to remove team member:', error);
    throw error;
  }
}

/**
 * Update member role
 * @param {string} email
 * @param {'admin'|'member'} role
 * @returns {Promise<Object>} Result
 */
export async function updateMemberRole(email, role) {
  try {
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    // Ensure BookDrive folder exists
    const folderId = await ensureBookDriveFolder(false);
    if (!folderId) {
      throw new Error('BookDrive folder not found');
    }

    // Get current team metadata
    const files = await listFiles(
      folderId,
      token,
      `name='${TEAM_METADATA_FILE}' and mimeType='application/json'`,
    );

    if (files.length === 0) {
      throw new Error('Team metadata not found');
    }

    const teamMetadata = await downloadFile(files[0].id, token);

    // Find and update member
    const member = teamMetadata.members.find((m) => m.email === email);
    if (!member) {
      throw new Error('Team member not found');
    }

    const oldRole = member.role;
    member.role = role;
    member.updated = new Date().toISOString();
    teamMetadata.updated = new Date().toISOString();

    // Update team metadata in Google Drive
    await uploadFile(TEAM_METADATA_FILE, teamMetadata, folderId, token);

    console.log('Team member role updated:', { email, oldRole, newRole: role });
    return {
      success: true,
      member,
      message: `Team member ${email} role updated from ${oldRole} to ${role}`,
    };
  } catch (error) {
    console.error('Failed to update member role:', error);
    throw error;
  }
}

/**
 * Check if current user is team admin
 * @returns {Promise<boolean>}
 */
export async function isTeamAdmin() {
  try {
    const userInfo = await getCurrentUserInfo();
    const members = await getTeamMembers();
    const currentUser = members.find((m) => m.email === userInfo.email);

    return currentUser?.role === 'admin';
  } catch (error) {
    console.error('Failed to check team admin status:', error);
    return false;
  }
}

/**
 * Get current user info
 * @returns {Promise<Object>} User info
 */
async function getCurrentUserInfo() {
  try {
    const result = await chrome.storage.local.get(['bookDriveUserInfo']);
    return result.bookDriveUserInfo || { email: 'unknown@example.com' };
  } catch (error) {
    console.error('Failed to get current user info:', error);
    return { email: 'unknown@example.com' };
  }
}

/**
 * Get or create device ID
 * @returns {Promise<string>} Device ID
 */
async function getOrCreateDeviceId() {
  const result = await chrome.storage.local.get(['bookDriveDeviceId']);

  if (result.bookDriveDeviceId) {
    return result.bookDriveDeviceId;
  }

  const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await chrome.storage.local.set({ bookDriveDeviceId: deviceId });

  return deviceId;
}
