<?php

	error_reporting(0);

	$result = shell_exec('curl -H \'Host: www.metromile.com\' -H \'Accept: application/json\' -H \'Pragma: no-cache\' -H \'Cache-Control: no-store, no-cache, must-revalidate, post-check=0, pre-check=0\' -H \'Sec-Fetch-Dest: empty\' -H \'authorization: OAuth oauth_timestamp="1582569454", oauth_nonce="289ee67d-a9bb-4666-8252-4532c895d0db", oauth_version="1.0", oauth_consumer_key="dashboard", oauth_signature_method="HMAC-SHA1", oauth_token="' . escapeshellarg($_REQUEST['token']) . '", oauth_signature="b0xANj2WtJOdzyurzpu9Yby0v7Q%3D"\' -H \'DNT: 1\' -H \'Sec-Fetch-Site: same-origin\' -H \'Sec-Fetch-Mode: cors\' -H \'Accept-Language: en-US,en;q=0.9\' --compressed \'https://www.metromile.com/dds/segment/lastLocation?vehicleId=' . escapeshellarg($_REQUEST['vehicleId']) . '\'');
	
	header('Content-type: application/json');
	
	if (is_null($result)) {
	    echo json_encode(array('error' => 'Unknown error'));
	} else {
		if (is_null(json_decode($result))) {
			echo json_encode(array('error' => 'JSON cannot be decoded'));
		} else {
			echo $result;
		}
	}

	curl_close($ch);

?>
