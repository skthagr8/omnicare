export async function sendCaregiverInvitation(formData, token) {
  // Map frontend fields to backend CaregiverInvitationCreate schema
  const payload = {
    caregiver_email: formData.email.trim(),
    full_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
    verification_source: formData.verificationSource.trim(),
    certifications: formData.certificationIds,
    // Map your org name string to its corresponding Organization UUID 
    // (Replace this lookup map with your actual organization UUID mapping source)
    org_association: mapOrgNameToUuid(formData.org)
  };

  const response = await fetch('/api/v1/auth/send-invitation-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to send caregiver invitation.');
  }

  return await response.json();
}

function mapOrgNameToUuid(orgName) {
  // Example lookup table mapping organization names to backend UUIDs
  const orgUuidMap = {
    'OmniCare Metro Health': 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'OmniCare Community Care': 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
    // Fallback default organization UUID if name is not found
  };
  return orgUuidMap[orgName] || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
}