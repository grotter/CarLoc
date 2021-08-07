<?php

	error_reporting(0);

	$credentialsPath = '/home/g/gr/grotter/notify/credentials.php';

	if (!file_exists($credentialsPath)) {
		$credentialsPath = '/Users/grotter/notify/credentials.php';
	}

	require($credentialsPath);

	$config = array();

	foreach ($credentials as $credential) {
		if ($credential['vehicleId'] == $_REQUEST['vehicleId']) {
			$config = $credential;
			break;
		}
	}

	$result = shell_exec('curl -H \'Accept: application/json\' -H \'Pragma: no-cache\' -H \'Cache-Control: no-store, no-cache, must-revalidate, post-check=0, pre-check=0\' -H \'authorization: OAuth oauth_timestamp="' . $config['timestamp'] . '", oauth_nonce="' . $config['nonce'] . '", oauth_version="1.0", oauth_consumer_key="dashboard", oauth_signature_method="HMAC-SHA1", oauth_token="' . escapeshellarg($_REQUEST['token']) . '", oauth_signature="' . $config['signature'] . '"\' --compressed \'https://www.metromile.com/dds/segment/lastLocation?vehicleId=' . escapeshellarg($_REQUEST['vehicleId']) . '\'');
	
	header('Content-type: application/json');
	
	if (is_null($result)) {
	    echo json_encode(array('error' => 'Unknown error'));
	} else {
		$data = json_decode($result);

		if (is_null($data)) {
			echo json_encode(array('error' => 'JSON cannot be decoded'));
		} else {
			$override = false;

			if (isset($_REQUEST['override'])) {
				$override = json_decode($_REQUEST['override']);
			}

			if (is_object($override)) {
				// write alternate street sweeping time to flat .json
				$data->override = $override;

				$success = false;

				$h = fopen('override-' . trim($_REQUEST['vehicleId']) . '.json', 'w');

				if ($h !== false) {
					if (fwrite($h, json_encode($data)) !== false) {
						$success = true;
					}	
				}
				
				fclose($h);
				echo json_encode(array('success' => $success, 'data' => $data));
			} else {
				// return location data
				echo $result;	
			}
		}
	}

?>
