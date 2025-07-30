<?php
// get the data from the POST message
$post_data = json_decode(file_get_contents('php://input'), true);
$data = $post_data['filedata'];
$id = $post_data['id'];
// the directory "data" must be writable by the server
$name = "../data/{$id}.csv"; 
// write the file to disk
file_put_contents($name, $data);
?>