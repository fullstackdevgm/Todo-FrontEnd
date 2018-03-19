import isElectron from 'is-electron'

export const environment = {
  isElectron: isElectron(),
  electronSyncAfterChangeSeconds : 5,
  production: true,
  baseApiUrl: isElectron() ? 'http://localhost:4747/api/v1' : 'https://api.todo-cloud.com/v1',
  googleMapsAPIKey: 'AIzaSyAm5XiUoP1swNgmUhouBdH1pVdB2PfkI3o',
  baseProfileImageUrl: "https://s3.amazonaws.com/todopro.com/user-images/profile-images-large",
  stripePublicKey: "pk_d9smE03J80d7tKfbPoA8QrTV3RKls",
  todoCloudAPIKey: '7e27rIW2gya22zCNQpRz3aNxiayaODlZ3ZOMMQvj'
};
