<?php

	error_reporting(0);

	$result = shell_exec('curl -H \'Accept: application/json\' -H \'Pragma: no-cache\' -H \'Cache-Control: no-store, no-cache, must-revalidate, post-check=0, pre-check=0\' -H \'authorization: OAuth oauth_timestamp="1582569454", oauth_nonce="289ee67d-a9bb-4666-8252-4532c895d0db", oauth_version="1.0", oauth_consumer_key="dashboard", oauth_signature_method="HMAC-SHA1", oauth_token="' . escapeshellarg($_REQUEST['token']) . '", oauth_signature="b0xANj2WtJOdzyurzpu9Yby0v7Q%3D"\' --compressed \'https://www.metromile.com/dds/segment/lastLocation?vehicleId=' . escapeshellarg($_REQUEST['vehicleId']) . '\'');
	
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
