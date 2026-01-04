let availableOwners: string[] = ['阿伟', 'choco', '05'];

export const setAvailableOwners = (owners: string[]) => {
  if (owners && owners.length > 0) {
    availableOwners = owners;
    console.log('[Owner Config] Updated available owners:', owners);
  }
};

export const getAvailableOwners = (): string[] => {
  return availableOwners;
};

export const isValidOwner = (owner: string): boolean => {
  return availableOwners.includes(owner);
};
