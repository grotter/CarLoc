<?php

	error_reporting(0);
	header('Content-type: application/json');
	header('Access-Control-Allow-Origin: *');

	function getCredentials ($vehicleId, $token, $isFuel) {
		$credentialsPath = '/private/grotter/notify/credentials.php';

		if (!file_exists($credentialsPath)) {
			$credentialsPath = '/Users/grotter/notify/credentials.php';
		}

		require($credentialsPath);
		
		$c = false;

		foreach ($credentials as $credential) {
			if ($credential['vehicleId'] == $vehicleId && $credential['token'] == $token) {
				if ($isFuel && !isset($credential['fuel'])) break;

				$c = $isFuel ? $credential['fuel'] : $credential;
				break;
			}
		}

		return $c;
	}

	$isFuel = isset($_REQUEST['fuel']);
	$endpoint = 'https://www.metromile.com/dds/segment/lastLocation';

	if ($isFuel) {
		$endpoint = 'https://www.metromile.com/dds/vehicleData/fuel_information/v1';
	}

	$credentials = getCredentials($_REQUEST['vehicleId'], $_REQUEST['token'], $isFuel);
	
	if (!$credentials) {
		die(json_encode(array('error' => 'Unknown error')));
	}
	
	$url = $endpoint . '?vehicleId=' . urlencode($_REQUEST['vehicleId']);

	$headers = array(
    	'Authorization: OAuth oauth_timestamp="' . $credentials['timestamp'] . '", oauth_nonce="' . $credentials['nonce'] . '", oauth_version="1.0", oauth_consumer_key="dashboard", oauth_signature_method="HMAC-SHA1", oauth_token="' . $credentials['token'] . '", oauth_signature="' . $credentials['signature'],
    	'Accept: application/json',
    	'Pragma: no-cache',
    	'Cache-Control: no-store, no-cache, must-revalidate, post-check=0, pre-check=0'
    );

	$opts = array(
		'http' => array(
			'method' => 'GET',
			'header' => implode("\r\n", $headers)
		)
	);

	$context = stream_context_create($opts);
	$result = file_get_contents($url, false, $context);

	if (!$result) {
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
