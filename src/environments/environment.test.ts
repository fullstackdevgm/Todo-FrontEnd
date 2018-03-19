import isElectron from 'is-electron'

export const environment = {
  isElectron: isElectron(),
  electronSyncAfterChangeSeconds : 5,
  production: false,
  baseApiUrl: isElectron() ? 'http://localhost:4747/api/v1' : 'https://api.todo-cloud.com/test-v1',
  googleMapsAPIKey: 'AIzaSyAm5XiUoP1swNgmUhouBdH1pVdB2PfkI3o',
  baseProfileImageUrl: "https://s3.amazonaws.com/dev.todopro.com/user-images/profile-images-large",
  stripePublicKey: "pk_PAFUEjoj7cCw2Bb7w5ZP3i4QpHjWI",
  todoCloudAPIKey: '7e27rIW2gya22zCNQpRz3aNxiayaODlZ3ZOMMQvj'
};
