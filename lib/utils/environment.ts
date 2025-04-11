export function getOwner(): string {
    if (!process.env.SAML_USERNAME) {
      throw new Error("Missing mandatory environment variable SAML_USERNAME! Check the README.");
    }
    return process.env.SAML_USERNAME;
}
  
export function getStackName(owner = getOwner()): string {
  return owner + "OnlineShop";
}
  