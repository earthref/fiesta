import {_} from 'lodash';

const magicVersions = ['2.0', '2.1', '2.2', '2.3', '2.4', '2.5', '3.0'];

export default class {

  constructor({Meteor, LocalState}) {
    this.Meteor = Meteor;
    this.LocalState = LocalState;

    // Clear errors and warnings
    this.LocalState.set('UPGRADE_CONTRIBUTION_ERRORS', []);
    this.LocalState.set('UPGRADE_CONTRIBUTION_WARNINGS', []);

    // Initalize upgrading state
    this.contributionTable; //Name of 2.5 and before uses "magic_contributions" 3.0 uses "contributions"
    this.table;
    this.rowNumber;
    this.column;

  }

  upgrade(jsonOld) {

    // Check for a valid input
    if (_.isEmpty(jsonOld)) {
      this._appendWarning('Contribution is empty.');
      return jsonOld;
    }

    // Look for the current MagIC data model version
    let currentVersion;

    //console.log("JSON file in parser: " + JSON.stringify(jsonOld));
    if(!jsonOld || (!jsonOld['magic_contributions'] && !jsonOld['contribution']))
    {
      //console.log("Appending error: " + JSON.stringify(jsonOld));
      this._appendError('Failed to find the "magic_contributions" or "contribution" table.');
      return jsonOld;
    }

    //before getting into contribution table specifics, check if there are both versions of the contribution table
    console.log(`currentVersion before error append: ${currentVersion}`);
    if (jsonOld['magic_contributions'] && jsonOld['contributions'])
    {
      this._appendError('Found both a "magic_contributions" and "contribution" table.');
      return jsonOld;
    }

    //****If we are using the old contribution table
    if (jsonOld['magic_contributions']) {
      if (jsonOld['magic_contributions'].length !== 1) {
        this._appendError('The "magic_contributions" table does not have exactly one row.');
        return jsonOld;
      }
      if (!jsonOld['magic_contributions'][0]['magic_version']) {
        this._appendError('The "magic_contributions" table does not include the "magic_version" column.');
        return jsonOld;
      }
      this.contributionTable = 'magic_contributions';
      currentVersion = jsonOld['magic_contributions'][0]['magic_version'];
    }
    //****If we are using the new contribution table
    if (jsonOld['contribution']) {
      if (jsonOld['contribution'].length !== 1) {
        this._appendError('The "contribution" table does not have exactly one row.');
        return jsonOld;
      }
      if (!jsonOld['contribution'][0]['magic_version']) {
        this._appendError('The "contribution" table does not include the "magic_version" column.');
        return jsonOld;
      }

      this.contributionTable = 'contribution';
      currentVersion = jsonOld['contribution'][0]['magic_version'];
    }

    // Check that the current MagIC data model version is valid, version must be in magicVersionsList
    if (_.indexOf(magicVersions, currentVersion) === -1) {
      let strVersions = magicVersions.map((str) => { return `"${str}"`; }).join(", ");
      this._appendError(`MagIC data model version ${currentVersion} is invalid. Expected one of: ${strVersions}.`);
      return jsonOld;
    }

    // Check that there is a newer MagIC data model
    console.log(`Current Version: ${currentVersion}`);
    if (_.indexOf(magicVersions, currentVersion) === magicVersions.length - 1) {
      this._appendWarning(`This contribution is already at the latest MagIC data model version ${currentVersion}.`);
      return jsonOld;
    }

    // Get the next MagIC data model
    let nextVersion = magicVersions[_.indexOf(magicVersions, currentVersion) + 1];

    //GGG GRAB DATA MODEL HERE BASED ON nextVersion


    // Upgrade the contribution
    let jsonNew = {};
    for (let table in jsonOld) {
      jsonNew[table] = [];
      for (let row of jsonOld[table]) {
        let newRow = {};
        for (let column in row) {
          if (table === this.contributionTable && column === 'magic_version') {
            newRow[column] = nextVersion;
          } else {
            newRow[column] = row[column];
          }
        }
        jsonNew[table].push(newRow);
      }
    }

    console.log("old: ", jsonOld);
    console.log("new: ", jsonNew);

    //if we have just processed the final version, simply retunr the json file
    if(_.indexOf(magicVersions,nextVersion) === magicVersions.length - 1) return jsonNew;
    else return this.upgrade(jsonNew);

  }

  _appendWarning(warningMessage) {
    const warnings = this.LocalState.get('UPGRADE_CONTRIBUTION_WARNINGS');
    const warning = { table: this.table, rowNumber: this.rowNumber, column: this.column, message: warningMessage};
    console.log('WARNING: ', warningMessage);
    warnings.push(warning);
    this.LocalState.set('UPGRADE_CONTRIBUTION_WARNINGS', warnings);
  }

  _appendError(errorMessage) {
    const errors = this.LocalState.get('UPGRADE_CONTRIBUTION_ERRORS');
    const error = { table: this.table, rowNumber: this.rowNumber, column: this.column, message: errorMessage};
    console.log('ERROR: ', errorMessage);
    errors.push(error);
    this.LocalState.set('UPGRADE_CONTRIBUTION_ERRORS', errors);
  }

}