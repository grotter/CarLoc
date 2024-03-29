<?php

	error_reporting(0);
	header('Content-type: application/json');
	header('Access-Control-Allow-Origin: *');

	function curlRequest ($url, $headers) {
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
		curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);

		$result = curl_exec($ch);

		if (curl_errno($ch)) {
		    // echo curl_error($ch);
		    curl_close($ch);
		    return false;
		}

		curl_close($ch);
		return $result;
	}

	function getOverride ($vehicleId, $token) {
		$c = getCredentials($vehicleId, $token, false);
		if ($c === false) return false;
		
		return file_get_contents('override/' . $vehicleId . '.json');
	}

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

	$isGetOverride = isset($_REQUEST['getoverride']);

	if ($isGetOverride) {
		$json = getOverride($_REQUEST['vehicleId'], $_REQUEST['token']);

		if ($json === false) {
			echo json_encode(array('error' => 'Unknown error'));
		} else {
			echo $json;
		}
		
		die;
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
    	'Authorization: OAuth oauth_timestamp="' . $credentials['timestamp'] . '", oauth_nonce="' . $credentials['nonce'] . '", oauth_version="1.0", oauth_consumer_key="dashboard", oauth_signature_method="HMAC-SHA1", oauth_token="' . $credentials['token'] . '", oauth_signature="' . $credentials['signature'] . '"',
    	'Accept: application/json, text/plain, */*',
    	'Pragma: no-cache',
    	'Cache-Control: no-store, no-cache, must-revalidate, post-check=0, pre-check=0'
    );

	$result = curlRequest($url, $headers);

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

				$h = fopen('override/' . trim($_REQUEST['vehicleId']) . '.json', 'w');

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
